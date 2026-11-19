import { useState } from "react";
import { Icon } from "../Icon";
import { hue, safeHttps, shortUrl, siteName, youtubeId } from "../../lib/text";

/** The attachment under a post: a YouTube player that plays in place, or a preview card that opens the page. */
export function LinkPreview({ url }: { url: string }) {
  const [play, setPlay] = useState(false);
  const href = safeHttps(url);
  if (!href) return null;
  const yt = youtubeId(href);
  if (yt) {
    return (
      <div className="lp lp-video">
        {play
          ? <div className="video"><iframe src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`} title="YouTube video player" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>
          : (
            <button type="button" className="video thumb" onClick={() => setPlay(true)} aria-label="Play the video here">
              <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" loading="lazy" />
              <span className="play" aria-hidden="true"><Icon name="play" size={22} /></span>
            </button>
          )}
        <div className="lp-foot">
          <span className="lp-site"><span className="lp-yt" aria-hidden="true"><Icon name="play" size={10} /></span>YouTube</span>
          <a href={href} target="_blank" rel="noopener noreferrer" className="lp-open">Open on YouTube<Icon name="external" size={14} /></a>
        </div>
      </div>
    );
  }
  const name = siteName(href);
  return (
    <a className="lp lp-card" href={href} target="_blank" rel="noopener noreferrer" title={href}>
      <span className="lp-tile" style={{ ["--h" as string]: hue(name) }} aria-hidden="true">{name.charAt(0)}</span>
      <span className="lp-text">
        <span className="lp-name">{name}</span>
        <span className="lp-url">{shortUrl(href, 64)}</span>
      </span>
      <span className="lp-go" aria-hidden="true"><Icon name="external" size={16} /></span>
      <span className="sr"> (opens in a new tab)</span>
    </a>
  );
}
