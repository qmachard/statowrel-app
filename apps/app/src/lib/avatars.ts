/**
 * Avatar catalogue, borrowed from CheckPack (`qmachard/checkpack-v3`) for now —
 * StatOwrel gets its own illustrated set later. The files are served as
 * `avatar-1.jpg` … `avatar-120.jpg`; `photo_url` stores the absolute URL, so
 * swapping the catalogue later leaves existing profiles readable.
 */
const AVATAR_BASE_URL = 'https://get.checkpack.fr/static/avatar-';
const AVATAR_COUNT = 120;

export const AVATAR_URLS: string[] = Array.from(
  { length: AVATAR_COUNT },
  (_, index) => `${AVATAR_BASE_URL}${index + 1}.jpg`,
);
