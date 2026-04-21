import NotFoundView from "@/components/errors/NotFound";

export const metadata = {
  title: "404 · Page Not Found",
};

export default function NotFound() {
  return <NotFoundView />;
}
