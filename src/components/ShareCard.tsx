import { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { fetchMyLogs, fetchPosts, rankingFrom } from "../lib/db";
import { detailOptions } from "../lib/ingredients";
import type { FeedPost, Media } from "../types";

// A 9:16 story card shown after a hike is posted, made to be saved or shared to
// Instagram stories. Everything on it comes from the saved post and the user's real
// mountain in Supabase. The card is laid out at 360×640 and exported at 3× (1080×1920).

const CARD_WIDTH = 360;
const CARD_HEIGHT = 640;
const EXPORT_SCALE = 3;
const MILESTONES = [1, 5, 10, 25, 50];

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
  photo: string | null;
  avatar: string | null;
  ingredient: string | null;
  cashew: string | null;
  logo: string;
  wordmarkLight: string; // for the photo
  wordmarkDark: string; // for the white milestone card
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
async function imageAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url, { mode: "cors", cache: "no-cache" });
  if (!response.ok) throw new Error(`Couldn't load ${url} (${response.status})`);
  return blobToDataUrl(await response.blob());
}

// A still from early in the video, drawn to a canvas. crossOrigin keeps the canvas
// readable; it works because Supabase Storage allows cross-origin reads.
function videoFrameAsDataUrl(url: string): Promise<string> {
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
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")!.drawImage(video, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
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

function mediaAsDataUrl(media: Media): Promise<string> {
  return media.type === "video" ? videoFrameAsDataUrl(media.url) : imageAsDataUrl(media.url);
}

// The wordmark SVG recolored: "Trail" in the given color, "Mix" stays orange
async function wordmark(color: string): Promise<string> {
  const svg = await (await fetch("/assets/logo-word.svg")).text();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/#3A2A1E/g, color))}`;
}

const optional = (load: Promise<string>) => load.catch((error) => {
  console.error("Share card image didn't load", error);
  return null;
});

async function loadCard(userId: string, logId: string): Promise<{ data: CardData; images: CardImages }> {
  const [{ posts }, logs] = await Promise.all([fetchPosts(userId, { logIds: [logId] }), fetchMyLogs(userId)]);
  const post = posts[0];
  const log = logs.find((entry) => entry.id === logId);
  if (!post || !log) throw new Error("Couldn't find your new post.");
  const ingredient = detailOptions.find((option) => option.label === log.highlights[0]) ?? null;
  const data: CardData = {
    post,
    rank: log.rank ?? rankingFrom(logs).indexOf(log.trailName) + 1,
    mountainSize: rankingFrom(logs).length,
    hikeCount: logs.length,
    ingredient,
  };
  const isFirst = data.hikeCount === 1;
  const [photo, avatar, ingredientIcon, cashew, logo, wordmarkLight, wordmarkDark] = await Promise.all([
    post.media[0] ? optional(mediaAsDataUrl(post.media[0])) : null,
    post.friend.avatar ? optional(imageAsDataUrl(post.friend.avatar)) : null,
    ingredient ? optional(imageAsDataUrl(ingredient.icon)) : null,
    isFirst ? optional(imageAsDataUrl("/assets/cashew-09-summit.svg")) : null,
    imageAsDataUrl("/assets/trailmix_logo.svg"),
    wordmark("#FFFFFF"),
    wordmark("#3A2A1E"),
  ]);
  return { data, images: { photo, avatar, ingredient: ingredientIcon, cashew, logo, wordmarkLight, wordmarkDark } };
}

function ordinal(n: number) {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

// A mountain silhouette with a pin where this hike sits: #1 at the summit, the last
// trail on the mountain near the foot of the slope
function MountainPin({ rank, total }: { rank: number; total: number }) {
  const summit = { x: 62, y: 9 };
  const foot = { x: 16, y: 52 };
  const t = total > 1 ? (rank - 1) / (total - 1) : 0;
  const x = summit.x + (foot.x - summit.x) * t;
  const y = summit.y + (foot.y - summit.y) * t;
  return (
    <svg aria-hidden="true" height="66" viewBox="0 0 132 66" width="132">
      <path d="M0 64 30 34l10 8L62 9l20 26 10-9 40 38Z" fill="rgba(255,255,255,.92)" />
      <path d="m62 9 9 11.5-5-2-4 4-4-3.5-6 2.5Z" fill="#dce5cf" />
      <g transform={`translate(${x} ${y})`}>
        <path d="M0 0c-4.6-5.4-7-9.2-7-12.4a7 7 0 0 1 14 0C7-9.2 4.6-5.4 0 0Z" fill="#e66a3c" stroke="#fff" strokeWidth="1.6" />
        <circle cx="0" cy="-12.4" fill="#fff" r="2.6" />
      </g>
    </svg>
  );
}

function Logo({ images, light }: { images: CardImages; light: boolean }) {
  return (
    <div className="share-logo">
      <img alt="" className="share-logo-mark" src={images.logo} />
      <img alt="TrailMix" className="share-logo-word" src={light ? images.wordmarkLight : images.wordmarkDark} />
    </div>
  );
}

function IngredientLine({ data, images }: { data: CardData; images: CardImages }) {
  if (!data.ingredient) return null;
  return (
    <div className="share-ingredient">
      {images.ingredient && <img alt="" src={images.ingredient} />}
      <span>+ {data.ingredient.ingredient} for the {data.ingredient.label.toLowerCase()}</span>
    </div>
  );
}

function Card({ data, images }: { data: CardData; images: CardImages }) {
  const { post, rank, hikeCount } = data;
  const isMilestone = MILESTONES.includes(hikeCount);
  const isFirst = hikeCount === 1;
  const person = post.friend;
  return (
    <>
      {images.photo ? (
        <img alt="" className="share-photo" src={images.photo} />
      ) : (
        <div className="share-photo share-photo-fallback" />
      )}
      <div className="share-shade" />

      {isMilestone ? (
        <div className="share-milestone">
          {isFirst && images.cashew && <img alt="" className="share-cashew" src={images.cashew} />}
          <Logo images={images} light={false} />
          <span className="share-avatar" style={{ background: person.color }}>
            {images.avatar ? <img alt="" src={images.avatar} /> : person.name.charAt(0).toUpperCase()}
          </span>
          {person.username && <span className="share-username">@{person.username}</span>}
          <h2>{isFirst ? "Your first summit!" : `You just ranked your ${ordinal(hikeCount)} hike!`}</h2>
          <p className="share-keep">Keep climbing!</p>
          <div className="share-milestone-hike">
            <b>{post.trail.name}</b>
            <span>#{rank} on my mountain</span>
            <IngredientLine data={data} images={images} />
          </div>
        </div>
      ) : (
        <>
          <div className="share-overlay">
            <h2>{post.trail.name}</h2>
            <p className="share-rank">#{rank} on my mountain</p>
            <MountainPin rank={rank} total={data.mountainSize} />
            <IngredientLine data={data} images={images} />
          </div>
          <div className="share-footer">
            <Logo images={images} light />
          </div>
        </>
      )}
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
