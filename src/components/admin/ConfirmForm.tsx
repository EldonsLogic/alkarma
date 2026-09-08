"use client";

/**
 * A <form> that confirms before submitting. Server Components can't attach an
 * onSubmit handler to a DOM <form>, so this thin client wrapper does it.
 * The server action is passed through as `action`.
 */
export function ConfirmForm({
  action,
  message,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
