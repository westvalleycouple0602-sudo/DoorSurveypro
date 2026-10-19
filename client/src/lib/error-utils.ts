// Enhanced error categorization and user-friendly messages

export type ErrorCategory = 'network' | 'validation' | 'permission' | 'notFound' | 'server' | 'unknown';

export interface EnhancedError {
  category: ErrorCategory;
  title: string;
  message: string;
  action?: string;
  canRetry: boolean;
}

/**
 * Categorize and enhance error messages for better user experience
 */
export function categorizeError(error: unknown): EnhancedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const statusMatch = errorMessage.match(/^(\d{3}):/);
  const statusCode = statusMatch ? parseInt(statusMatch[1]) : null;

  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
    return {
      category: 'network',
      title: 'Connection Problem',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      action: 'Check your network connection',
      canRetry: true,
    };
  }

  // 401 Unauthorized
  if (statusCode === 401 || errorMessage.includes('Unauthorized') || errorMessage.includes('Organization context not found')) {
    return {
      category: 'permission',
      title: 'Authentication Required',
      message: 'Your session may have expired. Please refresh the page or log in again.',
      action: 'Refresh the page or log in again',
      canRetry: false,
    };
  }

  // 403 Forbidden
  if (statusCode === 403 || errorMessage.includes('Forbidden') || errorMessage.includes('not allowed')) {
    return {
      category: 'permission',
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action. Please contact your administrator if you believe this is an error.',
      action: 'Contact your administrator for access',
      canRetry: false,
    };
  }

  // 404 Not Found
  if (statusCode === 404 || errorMessage.includes('not found') || errorMessage.includes('Not Found')) {
    return {
      category: 'notFound',
      title: 'Not Found',
      message: 'The requested resource could not be found. It may have been deleted or moved.',
      action: 'Verify the resource exists',
      canRetry: false,
    };
  }

  // 422 Validation errors
  if (statusCode === 422 || statusCode === 400 || errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return {
      category: 'validation',
      title: 'Invalid Input',
      message: errorMessage.includes(':') ? errorMessage.split(':').slice(1).join(':').trim() : 'Please check your input and try again. Some fields may be missing or contain invalid values.',
      action: 'Review and correct the highlighted fields',
      canRetry: true,
    };
  }

  // 500+ Server errors
  if (statusCode && statusCode >= 500) {
    return {
      category: 'server',
      title: 'Server Error',
      message: 'The server encountered an error while processing your request. Our team has been notified. Please try again in a few moments.',
      action: 'Try again in a few moments',
      canRetry: true,
    };
  }

  // AI/Service unavailable errors
  if (errorMessage.includes('AI') || errorMessage.includes('service unavailable') || errorMessage.includes('Service Unavailable')) {
    return {
      category: 'server',
      title: 'Service Temporarily Unavailable',
      message: 'This feature is temporarily unavailable. Please try again in a few moments.',
      action: 'Try again later',
      canRetry: true,
    };
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    return {
      category: 'network',
      title: 'Request Timeout',
      message: 'The request took too long to complete. This might be due to slow network or server load. Please try again.',
      action: 'Try again with a stable connection',
      canRetry: true,
    };
  }

  // Default unknown error
  return {
    category: 'unknown',
    title: 'Something Went Wrong',
    message: errorMessage || 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    action: 'Try again or contact support',
    canRetry: true,
  };
}

/**
 * Get icon name for error category (for lucide-react icons)
 */
export function getErrorIcon(category: ErrorCategory): string {
  switch (category) {
    case 'network':
      return 'WifiOff';
    case 'validation':
      return 'AlertCircle';
    case 'permission':
      return 'Lock';
    case 'notFound':
      return 'FileQuestion';
    case 'server':
      return 'ServerCrash';
    default:
      return 'AlertTriangle';
  }
}

/**
 * Get color variant for error category
 */
export function getErrorVariant(category: ErrorCategory): 'destructive' | 'default' {
  switch (category) {
    case 'validation':
      return 'default';
    default:
      return 'destructive';
  }
}
