import { NotAuthorizedClient } from "./not-authorized-client";

export const metadata = {
  title: "Not Authorized",
  description: "You do not have permission to access this page.",
};

export default function NotAuthorizedPage() {
  return <NotAuthorizedClient />;
}
