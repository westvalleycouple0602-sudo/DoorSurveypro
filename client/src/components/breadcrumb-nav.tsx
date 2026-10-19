import { useLocation } from 'wouter';
import { Link } from 'wouter';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { 
  Home, 
  FolderOpen, 
  FileText, 
  Package, 
  DollarSign,
  BarChart3,
  Settings,
  Users,
  ShoppingCart,
  Book,
  Layout,
  Wrench,
  Building2,
  FileSpreadsheet,
  Calculator,
  CheckSquare,
  TrendingUp,
  Target,
  Lightbulb,
} from 'lucide-react';

// Route configuration for pretty names and icons
const routeConfig: Record<string, { label: string; icon?: React.ComponentType<{ className?: string }> }> = {
  '': { label: 'Home', icon: Home },
  'dashboard': { label: 'Dashboard', icon: Layout },
  'projects': { label: 'Projects', icon: FolderOpen },
  'openings': { label: 'Door Openings', icon: Wrench },
  'new': { label: 'Create New' },
  'duplicate': { label: 'Duplicate' },
  'scope-of-work': { label: 'Scope of Work', icon: FileText },
  'hardware-schedule': { label: 'Hardware Schedule', icon: Package },
  'quotes': { label: 'Quotes', icon: DollarSign },
  'analytics': { label: 'Analytics', icon: BarChart3 },
  'manufacturers': { label: 'Manufacturers', icon: Building2 },
  'literature': { label: 'Literature', icon: Book },
  'purchase-orders': { label: 'Purchase Orders', icon: ShoppingCart },
  'settings': { label: 'Settings', icon: Settings },
  'profile': { label: 'Profile', icon: Settings },
  'team': { label: 'Team', icon: Users },
  'catalog': { label: 'Catalog', icon: Package },
  'reference': { label: 'Reference', icon: Book },
  'reference-library': { label: 'Reference Library', icon: Book },
  'cross-reference': { label: 'Cross Reference', icon: Book },
  'code-reference': { label: 'Code Reference', icon: Book },
  'import': { label: 'Import', icon: FileSpreadsheet },
  'export': { label: 'Export', icon: FileSpreadsheet },
  'costs': { label: 'Costs', icon: Calculator },
  'compliance': { label: 'Compliance', icon: CheckSquare },
  'floor-plans': { label: 'Floor Plans', icon: Layout },
  'templates': { label: 'Templates' },
  'bundles': { label: 'Bundles' },
  'customers': { label: 'Customers' },
  'billing': { label: 'Billing' },
  'change-orders': { label: 'Change Orders' },
  'engineering-review': { label: 'Engineering Review' },
  'disclaimers': { label: 'Disclaimers' },
  'gasketing-catalog': { label: 'Gasketing Catalog' },
  'keying-systems': { label: 'Keying Systems' },
  'wiring-diagrams': { label: 'Wiring Diagrams' },
  'quote-analytics': { label: 'Quote Analytics', icon: TrendingUp },
  'performance': { label: 'Performance Metrics', icon: Target },
  'competitive': { label: 'Competitive Analysis', icon: TrendingUp },
  'marketing-analytics': { label: 'Marketing Analytics', icon: TrendingUp },
  'recommendations': { label: 'Hardware Recommendations', icon: Lightbulb },
  'compliance-validation': { label: 'Compliance Validation', icon: CheckSquare },
  'lidar-scans': { label: 'LiDAR Scans' },
  'ar-measurements': { label: 'AR Measurements' },
  'computer-vision': { label: 'Computer Vision' },
  'document-intelligence': { label: 'Document Intelligence' },
  'reports': { label: 'Reports' },
  'integrations': { label: 'Integrations' },
  'branding': { label: 'Branding' },
  'roadmap': { label: 'Roadmap' },
  'sales': { label: 'Sales' },
  'marketing': { label: 'Marketing' },
  'case-studies': { label: 'Case Studies' },
  'resources': { label: 'Resources' },
  'blog-admin': { label: 'Blog Admin' },
  'bug-report': { label: 'Bug Report' },
  'pdf-catalog-import': { label: 'PDF Catalog Import' },
};

interface BreadcrumbSegment {
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
}

function useBreadcrumbs(): BreadcrumbSegment[] {
  const [location] = useLocation();
  
  if (location === '/' || location === '') {
    return [{ label: 'Dashboard', path: '/', icon: Home }];
  }
  
  const segments = location.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbSegment[] = [
    { label: 'Dashboard', path: '/', icon: Home }
  ];
  
  let currentPath = '';
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Check if segment looks like an ID (UUID or number)
    const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || 
                 /^\d+$/.test(segment);
    
    if (isId) {
      // For IDs, use context from the previous segment
      const prevSegment = segments[index - 1];
      const config = routeConfig[prevSegment];
      
      if (prevSegment === 'projects') {
        breadcrumbs.push({
          label: `Project #${segment.substring(0, 8)}`,
          path: currentPath,
          icon: FolderOpen,
        });
      } else if (prevSegment === 'openings') {
        breadcrumbs.push({
          label: `Opening #${segment.substring(0, 8)}`,
          path: currentPath,
          icon: Wrench,
        });
      } else {
        // Generic ID label
        breadcrumbs.push({
          label: `#${segment.substring(0, 8)}`,
          path: currentPath,
        });
      }
    } else {
      // Use configured label or capitalize segment
      const config = routeConfig[segment];
      const label = config?.label || segment.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      breadcrumbs.push({
        label,
        path: currentPath,
        icon: config?.icon,
      });
    }
  });
  
  return breadcrumbs;
}

export function BreadcrumbNav() {
  const breadcrumbs = useBreadcrumbs();
  
  // Don't show breadcrumbs on the home/dashboard page
  if (breadcrumbs.length <= 1) {
    return null;
  }
  
  return (
    <Breadcrumb data-testid="breadcrumb-nav">
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const Icon = crumb.icon;
          
          return (
            <div key={crumb.path} className="flex items-center gap-1.5">
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage data-testid={`breadcrumb-current-${crumb.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="flex items-center gap-1.5">
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      <span>{crumb.label}</span>
                    </div>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link 
                      href={crumb.path}
                      data-testid={`breadcrumb-link-${crumb.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {Icon && <Icon className="h-3.5 w-3.5" />}
                        <span>{crumb.label}</span>
                      </div>
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
