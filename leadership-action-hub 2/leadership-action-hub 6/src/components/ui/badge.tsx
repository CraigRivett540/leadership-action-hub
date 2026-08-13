import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-hh-primary-dark",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        open: "border-transparent bg-primary/10 text-hh-primary-dark",
        closed: "border-transparent bg-success/15 text-success",
        overdue: "border-transparent bg-destructive/10 text-destructive",
        request: "border-transparent bg-warning/15 text-warning",
        task: "border-transparent bg-hh-navy/10 text-hh-navy",
        todo: "border-transparent bg-ca-soft text-ca-primary-dark",
        family: "border-transparent bg-rose-100 text-rose-800",
        personal_task: "border-transparent bg-ca-soft text-ca-primary-dark",
        personal_request: "border-transparent bg-warning/15 text-warning",
        hh: "border-transparent bg-primary/10 text-hh-primary-dark",
        ca: "border-transparent bg-ca-soft text-ca-primary-dark",
        both: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
