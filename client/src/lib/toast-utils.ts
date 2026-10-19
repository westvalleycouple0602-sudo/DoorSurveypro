import { toast } from "@/hooks/use-toast";

export interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

export interface PromiseToastOptions<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: Error) => string);
}

export const toastSuccess = (options: ToastOptions) => {
  const { title, description, duration = 3000 } = options;
  
  return toast({
    variant: "success",
    title,
    description,
    duration,
  });
};

export const toastError = (options: ToastOptions) => {
  const { title, description, duration = 5000 } = options;
  
  return toast({
    variant: "error",
    title,
    description,
    duration,
  });
};

export const toastWarning = (options: ToastOptions) => {
  const { title, description, duration = 4000 } = options;
  
  return toast({
    variant: "warning",
    title,
    description,
    duration,
  });
};

export const toastInfo = (options: ToastOptions) => {
  const { title, description, duration = 4000 } = options;
  
  return toast({
    variant: "info",
    title,
    description,
    duration,
  });
};

export const toastLoading = (options: ToastOptions) => {
  const { title, description } = options;
  
  return toast({
    variant: "loading",
    title,
    description,
    duration: Infinity,
  });
};

export const toastPromise = async <T,>(
  promise: Promise<T>,
  options: PromiseToastOptions<T>
): Promise<T> => {
  const loadingToast = toastLoading({
    title: options.loading,
  });

  try {
    const data = await promise;
    
    const successMessage = typeof options.success === 'function' 
      ? options.success(data) 
      : options.success;
    
    toastSuccess({
      title: successMessage,
    });
    
    return data;
  } catch (error) {
    const errorMessage = typeof options.error === 'function'
      ? options.error(error as Error)
      : options.error;
    
    toastError({
      title: errorMessage,
      description: error instanceof Error ? error.message : undefined,
    });
    
    throw error;
  } finally {
    // Always dismiss loading toast in success or error case
    loadingToast.dismiss();
  }
};
