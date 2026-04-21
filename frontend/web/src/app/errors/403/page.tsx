import Forbidden from "@/components/errors/Forbidden";

export const metadata = {
  title: "403 · Forbidden",
};

export default function Page() {
  return <Forbidden />;
}
