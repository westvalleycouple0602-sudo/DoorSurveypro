import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LockedFeature } from '../locked-feature';
import { AIComplianceExplainer } from '../ai-compliance-explainer';
import { apiRequest } from '@/lib/queryClient';

jest.mock('@/lib/rum', () => ({ trackEvent: jest.fn() }));
jest.mock('@/lib/queryClient', () => ({ apiRequest: jest.fn() }));

describe('TypeScript repair regressions', () => {
  it.each(['overlay', 'disabled'] as const)('activates the %s lock once with Enter and Space', (variant) => {
    const onClick = jest.fn();
    render(<LockedFeature locked onClick={onClick} variant={variant}>Report</LockedFeature>);
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(button, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });
  it('forwards a supplied keyboard handler without also activating the fallback', () => {
    const onClick = jest.fn();
    const onKeyDown = jest.fn();
    render(<LockedFeature locked onClick={onClick} onKeyDown={onKeyDown}>Report</LockedFeature>);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
  it('leaves unlocked content interactive without a lock overlay', () => {
    render(<LockedFeature locked={false} onClick={jest.fn()}><span>Report</span></LockedFeature>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
  });
  it('renders the parsed AI response rather than the HTTP Response object', async () => {
    const json = jest.fn().mockResolvedValue({ violation: 'Test rule', explanation: 'Parsed explanation', impact: 'Test impact', solutions: ['Review dimensions'], urgency: 'medium' });
    jest.mocked(apiRequest).mockResolvedValue({ json } as unknown as Response);
    render(<AIComplianceExplainer violation={{ ruleCode: 'test', description: 'Test', severity: 'medium' }} doorSpecs={{}} />);
    fireEvent.click(screen.getByTestId('button-ai-explain'));
    expect(await screen.findByText('Parsed explanation')).toBeInTheDocument();
    expect(json).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Review dimensions')).toBeInTheDocument();
  });
  it('reenables the AI action after a failed request', async () => {
    jest.mocked(apiRequest).mockRejectedValue(new Error('Offline'));
    render(<AIComplianceExplainer violation={{ ruleCode: 'test', description: 'Test', severity: 'medium' }} doorSpecs={{}} />);
    fireEvent.click(screen.getByTestId('button-ai-explain'));
    await waitFor(() => expect(screen.getByTestId('button-ai-explain')).toBeEnabled());
    expect(screen.queryByText('Parsed explanation')).not.toBeInTheDocument();
  });
});
