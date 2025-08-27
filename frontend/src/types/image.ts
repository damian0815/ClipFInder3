//import { ContextMenu } from "radix-ui";
export default interface Image {
  id: string;
  path: string;
  distance: number | undefined;
  tags: string[] | undefined;
  order_key: number | number[] | undefined;
}


