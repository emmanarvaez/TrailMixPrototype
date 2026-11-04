import { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { fetchMyLogs, fetchPosts, rankingFrom } from "../lib/db";
import { detailOptions } from "../lib/ingredients";
import type { FeedPost, Media } from "../types";

// A 9:16 story card shown after a hike is posted, made to be saved or shared to
// Instagram stories: the post's photos (one filling the card, or a grid of up to six)
// with a white card on top and Cashew climbing onto it. Everything on it comes from the
// post and the user's real mountain in Supabase. The card is laid out at 360×640 and exported at 3× (1080×1920).

const CARD_WIDTH = 360;
const CARD_HEIGHT = 640;
const EXPORT_SCALE = 3;
const MILESTONES = [1, 5, 10, 25, 50];

// Photos from the post: one fills the card; 2–6 make a 2-column grid with thin gaps
const MAX_PHOTOS = 6;
const GRID_GAP = 2;
const PHOTO_PIXELS = CARD_WIDTH * EXPORT_SCALE; // photos are shrunk to about their exported size

type CashewPose = "summit" | "celebrate" | "its-fine" | "not-for-me";
const CASHEW_SVGS: Record<CashewPose, string> = {
  summit: "/assets/cashew-09-summit.svg",
  celebrate: "/assets/cashew-08-celebrate.svg",
  "its-fine": "/assets/cashew-03-its-fine.svg",
  "not-for-me": "/assets/cashew-04-not-for-me.svg",
};

type CardData = {
  post: FeedPost;
  rank: number; // place on the user's mountain
  mountainSize: number; // how many trails are on it
  hikeCount: number; // hikes logged, this one included
  ingredient: (typeof detailOptions)[number] | null;
};

// Every image on the card as a data URL, so the exported PNG never has to fetch
// anything (and can't be blocked by CORS or come out blank on Safari)
type CardImages = {
  photos: string[]; // the post's photos and video stills, in post order
  avatar: string | null;
  cashew: string | null;
  logo: string;
  wordmark: string;
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Supabase Storage sends CORS headers for public files. "no-cache" skips a copy the
// browser may have cached from a plain <img> on the feed, which lacks those headers.
async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { mode: "cors", cache: "no-cache" });
  if (!response.ok) throw new Error(`Couldn't load ${url} (${response.status})`);
  return response.blob();
}

async function imageAsDataUrl(url: string): Promise<string> {
  return blobToDataUrl(await fetchBlob(url));
}

// Redraws an image or video frame as a JPEG, either as its center square (`square`, for
// the avatar) or shrunk so its shorter side is at most `size` pixels (for photos)
function redraw(source: CanvasImageSource, width: number, height: number, size: number, square = false): string {
  const side = Math.min(width, height);
  const scale = Math.min(1, size / side);
  const crop = square ? { x: (width - side) / 2, y: (height - side) / 2, w: side, h: side } : { x: 0, y: 0, w: width, h: height };
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(square ? Math.min(size, side) : width * scale);
  canvas.height = Math.round(square ? Math.min(size, side) : height * scale);
  canvas.getContext("2d")!.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

// Loaded through a blob URL, which is same-origin, so the canvas stays readable
async function imageTile(url: string, size: number, square = false): Promise<string> {
  const objectUrl = URL.createObjectURL(await fetchBlob(url));
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return redraw(image, image.naturalWidth, image.naturalHeight, size, square);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// A still from early in the video. crossOrigin keeps the canvas readable; it works
// because Supabase Storage allows cross-origin reads.
function videoTile(url: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const fail = () => reject(new Error("Couldn't read a frame from the video"));
    video.onerror = fail;
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      try {
        resolve(redraw(video, video.videoWidth, video.videoHeight, size));
      } catch {
        fail();
      } finally {
        video.removeAttribute("src");
        video.load();
      }
    };
    video.src = url;
    video.load();
  });
}

const mediaTile = (media: Media) => (media.type === "video" ? videoTile(media.url, PHOTO_PIXELS) : imageTile(media.url, PHOTO_PIXELS));

// The wordmark SVG with "Trail" in the given color; "Mix" stays orange
async function wordmark(color: string): Promise<string> {
  const svg = await (await fetch("/assets/logo-word.svg")).text();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/#3A2A1E/g, color))}`;
}

const optional = (load: Promise<string>) => load.catch((error) => {
  console.error("Share card image didn't load", error);
  return null;
});

function cashewPose({ rank, mountainSize, hikeCount }: CardData): CashewPose {
  if (rank === 1 || hikeCount === 1) return "summit";
  if (MILESTONES.includes(hikeCount)) return "celebrate";
  if (rank <= Math.ceil(mountainSize / 3)) return "celebrate";
  if (rank <= Math.ceil((mountainSize * 2) / 3)) return "its-fine";
  return "not-for-me";
}

async function loadCard(userId: string, logId: string): Promise<{ data: CardData; images: CardImages }> {
  const [{ posts }, logs] = await Promise.all([fetchPosts(userId, { logIds: [logId] }), fetchMyLogs(userId)]);
  const post = posts[0];
  const log = logs.find((entry) => entry.id === logId);
  if (!post || !log) throw new Error("Couldn't find your new post.");
  const data: CardData = {
    post,
    rank: log.rank ?? rankingFrom(logs).indexOf(log.trailName) + 1,
    mountainSize: rankingFrom(logs).length,
    hikeCount: logs.length,
    ingredient: detailOptions.find((option) => option.label === log.highlights[0]) ?? null,
  };
  const media = post.media.slice(0, MAX_PHOTOS);
  const [photos, avatar, cashew, logo, wordmarkDark] = await Promise.all([
    Promise.all(media.map((item) => optional(mediaTile(item)))),
    post.friend.avatar ? optional(imageTile(post.friend.avatar, 3 * 44, true)) : null,
    optional(imageAsDataUrl(CASHEW_SVGS[cashewPose(data)])),
    imageAsDataUrl("/assets/trailmix_logo.svg"),
    wordmark("#3A2A1E"),
  ]);
  return {
    data,
    images: { photos: photos.filter((photo): photo is string => !!photo), avatar, cashew, logo, wordmark: wordmarkDark },
  };
}

function ordinal(n: number) {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

// One photo fills the card. More make a 2-column grid; with an odd count the first
// photo spans the top row (2 side by side, 3 = 1 + 2, 4 = 2×2, 5 = 1 + 2×2, 6 = 2×3).
function PhotoGrid({ photos }: { photos: string[] }) {
  if (photos.length === 0) return <div className="share-grid share-grid-empty" />;
  const rows = Math.ceil(photos.length / 2);
  return (
    <div className="share-grid" style={{ gap: GRID_GAP, gridTemplateColumns: photos.length > 1 ? "1fr 1fr" : "1fr", gridTemplateRows: `repeat(${rows}, 1fr)` }}>
      {photos.map((photo, index) => (
        <img
          alt=""
          className="share-tile"
          key={index}
          src={photo}
          style={index === 0 && photos.length % 2 === 1 ? { gridColumn: "1 / -1" } : undefined}
        />
      ))}
    </div>
  );
}

function Card({ data, images }: { data: CardData; images: CardImages }) {
  const { post, rank, hikeCount, ingredient } = data;
  const isMilestone = MILESTONES.includes(hikeCount);
  const person = post.friend;
  const headline = hikeCount === 1
    ? "Your first summit!"
    : isMilestone
      ? `You just ranked your ${ordinal(hikeCount)} hike!`
      : `${post.trail.name} is #${rank} on my mountain!`;
  const subline = isMilestone
    ? "Keep climbing!"
    : ingredient ? `+ ${ingredient.ingredient} for the ${ingredient.label.toLowerCase()}` : "";
  return (
    <>
      <PhotoGrid photos={images.photos} />
      <div className="share-panel-wrap">
        {/* Cashew's head shows over the top edge; his body is hidden behind the card */}
        {images.cashew && (
          <div className="share-cashew">
            <img alt="" src={images.cashew} />
          </div>
        )}
        <div className="share-panel">
          <div className="share-panel-top">
            <span className="share-avatar" style={{ background: person.color }}>
              {images.avatar ? <img alt="" src={images.avatar} /> : person.name.charAt(0).toUpperCase()}
            </span>
            <span className="share-person">
              <b>{person.name}</b>
              {person.username && <span>@{person.username}</span>}
            </span>
            <span className="share-logo">
              <img alt="" className="share-logo-mark" src={images.logo} />
              <img alt="TrailMix" className="share-logo-word" src={images.wordmark} />
            </span>
          </div>
          <h2>{headline}</h2>
          {subline && <p>{subline}</p>}
        </div>
        {images.cashew && (
          <>
            <span className="share-paw share-paw-left" />
            <span className="share-paw share-paw-right" />
          </>
        )}
      </div>
    </>
  );
}

function canShareFiles() {
  try {
    return !!navigator.canShare?.({ files: [new File([new Blob()], "card.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

async function exportCard(node: HTMLElement): Promise<Blob> {
  const render = (skipFonts: boolean) =>
    toBlob(node, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      pixelRatio: EXPORT_SCALE,
      skipFonts,
      style: { transform: "none" }, // the on-screen card is scaled to fit; the export isn't
    });
  const once = async () => {
    try {
      return await render(false);
    } catch (error) {
      // The app's web font couldn't be embedded: fall back to the system font
      console.error("Couldn't embed fonts in the share card", error);
      return render(true);
    }
  };
  // Safari sometimes leaves images out of the first render, so render twice and keep the second
  await once();
  const blob = await once();
  if (!blob) throw new Error("Couldn't create the image.");
  return blob;
}

export default function ShareCard({ userId, logId, onClose }: { userId: string; logId: string; onClose: () => void }) {
  const [card, setCard] = useState<{ data: CardData; images: CardImages } | null>(null);
  const [png, setPng] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [scale, setScale] = useState(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareable] = useState(canShareFiles);

  useEffect(() => {
    let cancelled = false;
    loadCard(userId, logId)
      .then((loaded) => { if (!cancelled) setCard(loaded); })
      .catch((loadError) => { if (!cancelled) setError((loadError as Error).message ?? "Couldn't make your card."); });
    return () => { cancelled = true; };
  }, [userId, logId]);

  // Made as soon as the card is on screen, so Share can open the share sheet straight
  // from the tap (Safari refuses navigator.share after a slow await)
  useEffect(() => {
    if (!card || !cardRef.current) return;
    let cancelled = false;
    const node = cardRef.current;
    document.fonts.ready
      .then(() => exportCard(node))
      .then((blob) => { if (!cancelled) setPng(blob); })
      .catch((exportError) => {
        console.error("Couldn't export the share card", exportError);
        if (!cancelled) setError("Couldn't create the image.");
      });
    return () => { cancelled = true; };
  }, [card]);

  useEffect(() => {
    const fit = () => setScale(Math.min((window.innerWidth - 32) / CARD_WIDTH, (window.innerHeight - 150) / CARD_HEIGHT, 1.25));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const fileName = () => {
    const trail = card?.data.post.trail.name ?? "hike";
    return `trailmix-${trail.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;
  };

  const download = () => {
    if (!png) return;
    const url = URL.createObjectURL(png);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const share = () => {
    if (!png) return;
    const file = new File([png], fileName(), { type: "image/png" });
    navigator.share({ files: [file], title: card?.data.post.trail.name }).catch((shareError: Error) => {
      if (shareError.name !== "AbortError") console.error("Share failed", shareError);
    });
  };

  return (
    <div aria-label="Share your hike" aria-modal="true" className="share-screen" role="dialog">
      <button aria-label="Close and go to the feed" className="share-close" onClick={onClose} type="button">
        <svg aria-hidden="true" fill="none" height="22" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" viewBox="0 0 24 24" width="22">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      <div className="share-stage" style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale }}>
        {card ? (
          <div className="share-card" ref={cardRef} style={{ transform: `scale(${scale})` }}>
            <Card data={card.data} images={card.images} />
          </div>
        ) : (
          <div className="share-loading">{error || "Making your card…"}</div>
        )}
      </div>

      {card && error && <p className="share-error">{error}</p>}

      <div className="share-actions">
        <button className="share-button" disabled={!png} onClick={download} type="button">
          {png ? "Download" : "Preparing…"}
        </button>
        {shareable && (
          <button className="share-button share-button-primary" disabled={!png} onClick={share} type="button">
            Share
          </button>
        )}
      </div>
    </div>
  );
}
