import { redirect } from "next/navigation";

export default function DelegasiPage() {
  redirect("/board?delegasi=1");
}
