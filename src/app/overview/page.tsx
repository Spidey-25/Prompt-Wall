import { redirect } from "next/navigation";

/** /overview → redirect to the Security Overview at `/`. */
export default function OverviewRedirect() {
  redirect("/");
}
