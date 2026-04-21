import ServiceUnavailable from "@/components/errors/ServiceUnavailable";

export const metadata = {
  title: "503 · Service Unavailable",
};

export default function Page() {
  return <ServiceUnavailable />;
}
