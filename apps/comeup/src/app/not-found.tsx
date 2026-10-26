import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="wrap-tight py-28">
      <EmptyState
        title="That page isn't here"
        body="The link may be stale, or the archive item may have been renamed when the archive was last compiled. The archive index is the reliable way in."
        action={
          <div className="flex gap-3">
            <Link href="/archive" className="btn btn-ghost">
              Browse the archive
            </Link>
            <Link href="/plan" className="btn btn-primary">
              Get the plan
            </Link>
          </div>
        }
      />
    </div>
  );
}
