import Unauthorized from "@/components/errors/Unauthorized";

export const metadata = {
  title: "401 · Unauthorized",
};

export default function Page() {
  return <Unauthorized />;
}
