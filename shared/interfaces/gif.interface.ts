export interface GifCategory {
  _id: string;
  name: string;
  imgUrl: string;
  sortOrder: number;
}

export interface Gif {
  _id?: string;
  url: string;
  staticUrl: string;
}
