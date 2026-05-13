declare module "lucide-react" {
  import { FC, SVGProps } from "react";
  export const Search: FC<SVGProps<SVGSVGElement>>;
  export const Grid3X3: FC<SVGProps<SVGSVGElement>>;
  export const Columns: FC<SVGProps<SVGSVGElement>>;
  export const List: FC<SVGProps<SVGSVGElement>>;
  export const Menu: FC<SVGProps<SVGSVGElement>>;
  export const X: FC<SVGProps<SVGSVGElement>>;
}

declare module "react-window" {
  import { ComponentType, CSSProperties, ReactNode } from "react";

  export interface GridChildComponentProps {
    columnIndex: number;
    rowIndex: number;
    style: CSSProperties;
    data?: any;
    isScrolling?: boolean;
  }

  export interface GridProps {
    children: ComponentType<GridChildComponentProps>;
    columnCount: number;
    columnWidth: number;
    height: number;
    rowCount: number;
    rowHeight: number;
    width: number;
    overscanRowCount?: number;
    overscanColumnCount?: number;
    onItemsRendered?: (props: {
      overscanColumnStartIndex: number;
      overscanColumnStopIndex: number;
      overscanRowStartIndex: number;
      overscanRowStopIndex: number;
      visibleColumnStartIndex: number;
      visibleColumnStopIndex: number;
      visibleRowStartIndex: number;
      visibleRowStopIndex: number;
    }) => void;
    onScroll?: (props: {
      scrollDirection: "forward" | "backward";
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => void;
    ref?: any;
    style?: CSSProperties;
    itemData?: any;
    useIsScrolling?: boolean;
    initialScrollTop?: number;
    initialScrollLeft?: number;
  }

  export const Grid: ComponentType<GridProps>;
}
