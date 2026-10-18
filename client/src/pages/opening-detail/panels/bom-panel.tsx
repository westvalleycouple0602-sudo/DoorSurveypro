import { BomList } from "@/components/bom-list";
import { useOpeningDetail } from "../context";

export default function BomPanel() {
  const { openingId } = useOpeningDetail();

  return <BomList openingId={openingId} />;
}
