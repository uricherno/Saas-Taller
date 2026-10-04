import { redirect } from "next/navigation";

// El proxy ya redirige "/" según haya sesión o no; esto es un respaldo.
export default function Home() {
  redirect("/login");
}
