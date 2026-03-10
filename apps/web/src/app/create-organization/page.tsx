import { redirect } from "next/navigation";

export default function CreateOrganizationPage() {
  redirect("/auth?mode=sign-up");
}
