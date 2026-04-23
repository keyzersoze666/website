# Replacing the logo, journal icon and founder photographs

Replace these files in the repository, keeping their names, then rebuild and publish the site:

| Asset                                    | Repository file                   | Used by                                            |
| ---------------------------------------- | --------------------------------- | -------------------------------------------------- |
| Company emblem (name rendered alongside) | `public/brand/logo.svg`           | Header and footer on every page                    |
| Standalone company symbol                | `public/brand/logo-mark.svg`      | About Us, above the company name                   |
| Journal profile icon                     | `public/journal/team-profile.svg` | Journal cards, article bylines and author profiles |
| First founder photograph                 | `public/team/founder-1.jpeg`      | Business & Product founder profile                 |
| Second founder photograph                | `public/team/founder-2.jpeg`      | Engineering & Research founder profile             |

The supplied files preserve a working default until approved replacements are ready. The two founder files are independent JPEGs and can be replaced separately. Public URLs omit the `public` directory, for example `/brand/logo.svg`.

## SVG preparation and display

Use a self-contained SVG with a valid, tightly cropped `viewBox`. `logo.svg` and `logo-mark.svg` contain the company emblem only; the header/footer render `brand.name` as real text beside it, while About Us places the name below it. Keep the two symbol files in sync when replacing the emblem. The current files use the supplied angular emblem, with the approved paths and proportions. `currentColor` on its fill/stroke lets the theme choose a contrasting colour.

`SvgAsset.astro` imports local brand/journal SVGs as raw text during the build and embeds their geometry directly in the page. It does not use CSS masks, image fetches or client-side loading. Missing files fail the build. This avoids empty mask boxes and artwork appearing only after its fade has completed. Artwork must contain only trusted, self-contained SVG geometry; omit scripts, external images/fonts and duplicate IDs. The journal icon retains the supplied emblem and RESEARCH wordmark, with the black background removed and deep green artwork for contrast on white. Its wordmark is enlarged and letter spacing tightened for small-size legibility.

The header/footer combine a 49 × 44px emblem with a 22px company name on desktop, reducing to 42 × 38px and 20px on mobile. Header strokes are slightly stronger for small-size legibility. The emblem uses green on light editorial surfaces and pale mint on dark surfaces; the company name follows the high-contrast text colour. The dark footer retains its contrasting colours. Compact/standard journal icons are 40/44px; the author profile uses 64px. Their background stays white in both themes, with circular frames and 4px padding (6px for the author profile). Keep the SVG background transparent so the complete RESEARCH wordmark fits within the padded circle.

About Us displays a 160–220px-wide emblem with an explicit proportional height above the 30–44px company name. Both are embedded in the initial HTML, beside the introductory copy on desktop and below it on smaller screens. The complete symbol/name group fades in together over 900ms using a smooth CSS easing curve, without a separate delayed title. Reduced motion shows the final artwork immediately. There is no animation loader, canvas, request loop or About logo JavaScript. `src/styles/about-logo.css` controls sizing and motion. The favicon uses the same emblem on a dark background.

## Founder photographs

Use genuine JPEG encoding, with the exact `.jpeg` filenames above. The current placeholders are 600 × 480 pixels; this size or larger is suitable. Keep the face near the centre and leave a little room around it. The portrait uses a circular frame with a theme-aware border and centred `object-fit: cover`, so edges may be cropped. Its displayed diameter comes from `--founder-photo-size` in `src/styles/about.css`: 112px on desktop and 88px on mobile. Changing only the `<img>` width/height attributes does not resize this CSS-controlled frame. Each portrait sits beside the founder name/role, and the description occupies a separate row below both.

Replacing a JPEG changes the displayed photograph after rebuilding. Founder names, roles, background descriptions and alt text remain editable in `src/data/founders.json`. The fields are `name`, `role` and `description`. Names use a separate 29px heading (27px on mobile); roles always use the smaller 15px style and biographies use 18px body text. A role is never promoted to the name heading. The existing `isPlaceholder` flag controls whether the unverified sample name is shown; it does not prevent the photograph from displaying. Supply approved biography/name details before changing that flag to false.

## Header and navigation backgrounds

`--header-background` is the single source for the header, its compact state, the navigation panel and dropdowns. It resolves to the dark homepage background or the current editorial paper colour. The navigation does not use a separate card shade, and no translucent overlay creates a different strip behind the tabs.

## Search and social images

`public/brand/logo-search.svg` supplies the search-engine organization logo, and `public/brand/social-card.png` is the 1200 × 630 social preview. Its editable vector source lives in `assets/brand/social-card.svg`, outside the public deployment output. Update the vector source and render a matching PNG when the approved branding changes; preserve the preview dimensions.
