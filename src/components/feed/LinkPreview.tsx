import { useState, type ReactNode } from "react";
import { Icon } from "../Icon";
import { hue, safeHttps, shortUrl, siteName, youtubeId } from "../../lib/text";
import { useDoubleTap } from "../../lib/useDoubleTap";

/**
 * The media under a post's header, full width like Instagram:
 * - YouTube: the thumbnail; a tap plays it in place, a double tap likes the post (the play waits a moment to tell them apart).
 * - Any other https link: a rich card with a cover in the site's colour; the whole card opens the page in a new tab.
 * `overlay` is drawn over the video (the heart burst after a double tap).
 */
export function LinkPreview({ url, onDouble, overlay }: { url: string; onDouble?: () => void; overlay?: ReactNode }) {
  const [play, setPlay] = useState(false);
  const tap = useDoubleTap(() => onDouble?.(), () => setPlay(true));
  const href = safeHttps(url);
  if (!href) return null;
  const yt = youtubeId(href);
  if (yt) {
    return (
      <div className="lp lp-video media">
        {play
          ? <div className="video"><iframe src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`} title="YouTube video player" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>
          : (
            <button type="button" className="video thumb" onClick={onDouble ? tap : () => setPlay(true)} aria-label="Play the video here">
              <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" />
              <span className="play" aria-hidden="true"><Icon name="play" size={22} /></span>
            </button>
          )}
        {!play && overlay}
        <div className="lp-foot">
          <span className="lp-site"><span className="lp-yt" aria-hidden="true"><Icon name="play" size={10} /></span>YouTube</span>
          <a href={href} target="_blank" rel="noopener noreferrer" className="lp-open">Open on YouTube<Icon name="external" size={14} /></a>
        </div>
      </div>
    );
  }
  const name = siteName(href);
  return (
    <a className="lp lp-card media" href={href} target="_blank" rel="noopener noreferrer" title={href} style={{ ["--h" as string]: hue(name) }}>
      <span className="lp-cover"><span className="lp-tile" aria-hidden="true">{name.charAt(0)}</span><span className="lp-name">{name}</span></span>
      <span className="lp-row">
        <span className="lp-url">{shortUrl(href, 64)}</span>
        <span className="lp-go" aria-hidden="true"><Icon name="external" size={16} /></span>
      </span>
      <span className="sr"> (opens in a new tab)</span>
    </a>
  );
}
