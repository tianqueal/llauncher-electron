import { ButtonProps } from '@headlessui/react';

export interface FormButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
  isSuccess?: boolean;
  children: React.ReactNode;
  className?: string;
}
