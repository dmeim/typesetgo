import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type useEmblaCarousel from "embla-carousel-react";
import type { UseEmblaCarouselType } from "embla-carousel-react";

export type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;

export type CarouselProps = {
  opts?: UseCarouselParameters[0];
  plugins?: UseCarouselParameters[1];
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: UseEmblaCarouselType[0];
  api: CarouselApi;
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

export const CarouselContext = createContext<CarouselContextProps | null>(null);

export function useCarousel() {
  const context = useContext(CarouselContext);
  if (!context) throw new Error("useCarousel must be used within a <Carousel />");
  return context;
}

const getServerNavigation = () => 0;

export function useCarouselNavigation(api: CarouselApi) {
  const subscribe = useCallback((notify: () => void) => {
    if (!api) return () => {};
    api.on("select", notify);
    api.on("reInit", notify);
    return () => {
      api.off("select", notify);
      api.off("reInit", notify);
    };
  }, [api]);
  // A primitive snapshot stays stable while both navigation capabilities match.
  const getSnapshot = useCallback(() =>
    (api?.canScrollPrev() ? 1 : 0) | (api?.canScrollNext() ? 2 : 0), [api]);
  const navigation = useSyncExternalStore(subscribe, getSnapshot, getServerNavigation);
  return { canScrollPrev: Boolean(navigation & 1), canScrollNext: Boolean(navigation & 2) };
}
