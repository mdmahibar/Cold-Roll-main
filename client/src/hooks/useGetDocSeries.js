import { useQuery } from "@tanstack/react-query";
import { getAllItems } from "../SAPB1/Items/ItemServices";


export function useAllDocSeries() {
  return useQuery({
    queryKey: ["docSeries"],
    queryFn: getAllItems,
  });
}

