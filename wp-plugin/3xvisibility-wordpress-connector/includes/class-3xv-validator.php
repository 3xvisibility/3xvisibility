<?php
/**
 * Post-publish render validator.
 *
 * Fetches the FINAL rendered HTML of a connector-published page, extracts the
 * "key CSS rules" the imported template is expected to enforce (from the stored
 * template/critical CSS), and confirms — against the real rendered DOM and every
 * stylesheet the page actually loads — that those rules win the cascade. When a
 * theme (or any non-connector) stylesheet still overrides a key rule, or when a
 * key rule is missing entirely from the live page, it is reported as a conflict.
 *
 * This is a self-contained, dependency-free mini CSS cascade engine:
 *   - Parses every <style> block + same-host <link> stylesheet into rules.
 *   - Classifies each rule's source (connector / elementor / theme).
 *   - Parses the rendered HTML into a DOM and matches selectors (tag/id/class/
 *     attribute + descendant/child combinators; sibling combinators and @media
 *     conditions are intentionally skipped to avoid false positives).
 *   - For each key declaration, finds the winning rule per matched element using
 *     real cascade order (importance > specificity > source order) and flags any
 *     element whose winner is a theme rule instead of the connector rule.
 *
 * @package 3xVisibilityConnector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XXXV_Validator {

	/** Only these visually/layout critical properties are treated as "key". */
	const KEY_PROPS = array(
		'color', 'background', 'background-color', 'background-image',
		'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
		'text-align', 'text-transform', 'text-decoration',
		'display', 'grid-template-columns', 'flex-direction', 'flex-wrap',
		'justify-content', 'align-items', 'gap', 'row-gap', 'column-gap',
		'width', 'max-width', 'min-width', 'height', 'min-height', 'max-height',
		'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
		'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
		'border', 'border-radius', 'box-shadow', 'position', 'object-fit',
		'overflow', 'opacity', 'z-index',
	);

	const MAX_LINK_SHEETS   = 15;   // Max same-host <link> stylesheets to fetch.
	const MAX_SHEET_BYTES   = 700000; // Truncate each stylesheet body to this size.
	const MAX_RULES         = 6000; // Hard cap on parsed rules (safety).
	const MAX_ELEMENTS      = 2500; // Hard cap on DOM elements analyzed.
	const MAX_KEY_DECLS     = 400;  // Hard cap on key declarations checked.
	const MAX_REPORTED      = 150;  // Cap on conflicts / missing entries returned.

	/**
	 * REST callback: POST /validate-render  { post_id }.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function validate_render( $request ) {
		$post_id = 0;
		if ( is_object( $request ) && method_exists( $request, 'get_param' ) ) {
			$post_id = (int) ( $request->get_param( 'post_id' ) ?: $request->get_param( 'page_id' ) );
		}
		if ( $post_id < 1 ) {
			return new WP_Error( 'xxxv_validate_no_post', 'A valid post_id is required.', array( 'status' => 400 ) );
		}
		if ( 'page' !== get_post_type( $post_id ) ) {
			return new WP_Error( 'xxxv_validate_bad_post', 'post_id does not reference a page.', array( 'status' => 404 ) );
		}

		$result = self::run( $post_id );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return rest_ensure_response( $result );
	}

	/**
	 * Run the full render validation for a page.
	 *
	 * @param int $post_id Page ID.
	 * @return array|WP_Error
	 */
	public static function run( $post_id ) {
		$post_id  = (int) $post_id;
		$expected = XXXV_Elementor::public_runtime_template_css( $post_id );
		if ( ! is_string( $expected ) || '' === trim( $expected ) ) {
			return array(
				'ok'                  => true,
				'post_id'             => $post_id,
				'rendered'            => false,
				'reason'              => 'No stored connector template CSS for this page; nothing to validate.',
				'checked_rules'       => 0,
				'present'             => 0,
				'missing'             => array(),
				'conflicts'           => array(),
				'stylesheets_analyzed'=> 0,
			);
		}

		$url  = get_permalink( $post_id );
		$html = self::fetch_rendered_html( $url );
		if ( is_wp_error( $html ) ) {
			return array(
				'ok'            => false,
				'post_id'       => $post_id,
				'rendered'      => false,
				'reason'        => 'Could not fetch the rendered page: ' . $html->get_error_message(),
				'rendered_url'  => $url,
				'checked_rules' => 0,
				'present'       => 0,
				'missing'       => array(),
				'conflicts'     => array(),
				'stylesheets_analyzed' => 0,
			);
		}

		// --- Build the DOM -----------------------------------------------------
		$dom = self::load_dom( $html );
		if ( ! $dom ) {
			return new WP_Error( 'xxxv_validate_dom', 'Rendered HTML could not be parsed into a DOM.', array( 'status' => 500 ) );
		}
		$xpath    = new DOMXPath( $dom );
		$elements = self::collect_elements( $xpath );

		// --- Collect + parse every stylesheet the page loads -------------------
		$origin = self::origin_host( $url );
		$rules  = array();
		$order  = 0;
		$sheets_analyzed = 0;

		$sheet_nodes = $xpath->query( '//style | //link[@rel="stylesheet"] | //link[contains(@rel,"stylesheet")]' );
		if ( $sheet_nodes ) {
			foreach ( $sheet_nodes as $node ) {
				if ( ! ( $node instanceof DOMElement ) ) {
					continue;
				}
				$tag = strtolower( $node->nodeName );
				if ( 'style' === $tag ) {
					$css    = (string) $node->textContent;
					$id     = (string) $node->getAttribute( 'id' );
					$source = self::classify_source( $id, '' );
				} else {
					$href = (string) $node->getAttribute( 'href' );
					if ( '' === $href ) {
						continue;
					}
					if ( ! self::is_same_host( $href, $origin ) ) {
						continue; // Skip external CDNs (fonts, etc.) — they don't drive layout.
					}
					if ( $sheets_analyzed >= self::MAX_LINK_SHEETS ) {
						continue;
					}
					$css = self::fetch_stylesheet( $href );
					if ( '' === $css ) {
						continue;
					}
					$sheets_analyzed++;
					$source = self::classify_source( '', $href );
				}

				if ( '' === trim( (string) $css ) ) {
					continue;
				}
				foreach ( self::parse_css_rules( $css ) as $parsed ) {
					if ( count( $rules ) >= self::MAX_RULES ) {
						break 2;
					}
					$decls = self::parse_declarations( $parsed['body'] );
					if ( ! $decls ) {
						continue;
					}
					foreach ( self::split_selectors( $parsed['selector'] ) as $sel ) {
						$seq = self::selector_to_sequence( $sel );
						if ( null === $seq ) {
							continue; // Unsupported (sibling combinator, empty, etc.).
						}
						$rules[] = array(
							'seq'   => $seq,
							'spec'  => self::specificity( $sel ),
							'order' => $order++,
							'src'   => $source,
							'sel'   => $sel,
							'decls' => $decls,
						);
					}
				}
			}
		}

		// --- Derive the "key" declarations from the connector template CSS -----
		$key_decls = self::key_declarations( $expected );

		$missing   = array();
		$conflicts = array();
		$present   = 0;
		$checked   = 0;

		foreach ( $key_decls as $kd ) {
			$checked++;
			$seq = self::selector_to_sequence( $kd['selector'] );
			if ( null === $seq ) {
				continue;
			}
			$targets = self::match_elements( $elements, $seq );
			if ( ! $targets ) {
				continue; // Selector targets nothing in the live DOM — not a CSS conflict.
			}

			$prop            = $kd['property'];
			$found_connector = false;
			$reported_here   = false;

			foreach ( $targets as $el ) {
				$winner = self::cascade_winner( $rules, $el, $prop );
				if ( null === $winner ) {
					continue;
				}
				if ( 'theme' !== $winner['src'] ) {
					$found_connector = $found_connector || ( 'connector' === $winner['src'] );
					continue;
				}
				// A theme rule wins this property on this element -> conflict.
				if ( ! $reported_here && count( $conflicts ) < self::MAX_REPORTED ) {
					$conflicts[] = array(
						'selector'          => $kd['selector'],
						'property'          => $prop,
						'expected'          => $kd['value'],
						'expected_important'=> (bool) $kd['important'],
						'actual'            => $winner['value'],
						'overriding_selector' => $winner['sel'],
						'overriding_important'=> (bool) $winner['important'],
						'element'           => self::element_path( $el ),
						'reason'            => self::conflict_reason( $kd, $winner ),
					);
					$reported_here = true;
				}
			}

			if ( $found_connector ) {
				$present++;
			} elseif ( ! $reported_here && count( $missing ) < self::MAX_REPORTED ) {
				// Our rule targets a live element but no connector declaration won
				// (and no theme override was flagged) -> the key CSS is absent from
				// the rendered page (e.g. a cache plugin stripped our <style>).
				$missing[] = array(
					'selector' => $kd['selector'],
					'property' => $prop,
					'expected' => $kd['value'],
				);
			}
		}

		$ok = ( empty( $conflicts ) && empty( $missing ) );

		$summary = $ok
			? sprintf( 'All %d key CSS rules verified in the rendered DOM; no theme overrides detected.', $present )
			: sprintf( '%d conflict(s), %d missing of %d key rules checked.', count( $conflicts ), count( $missing ), $checked );

		XXXV_Elementor_Validator_log( $post_id, $ok, count( $conflicts ), count( $missing ) );

		return array(
			'ok'                   => $ok,
			'post_id'              => $post_id,
			'rendered'             => true,
			'rendered_url'         => $url,
			'checked_rules'        => $checked,
			'present'              => $present,
			'missing'              => array_values( $missing ),
			'conflicts'            => array_values( $conflicts ),
			'stylesheets_analyzed' => $sheets_analyzed,
			'summary'              => $summary,
		);
	}

	// =====================================================================
	// Fetching
	// =====================================================================

	/**
	 * Fetch the final rendered HTML for a URL via a cache-busting loopback GET.
	 *
	 * @param string $url Permalink.
	 * @return string|WP_Error
	 */
	private static function fetch_rendered_html( $url ) {
		if ( ! is_string( $url ) || '' === $url ) {
			return new WP_Error( 'xxxv_validate_no_url', 'The page has no public permalink.' );
		}
		$bust = add_query_arg( 'xxxv_novalidate', (string) time(), $url );
		$resp = wp_remote_get(
			$bust,
			array(
				'timeout'     => 20,
				'redirection' => 3,
				'sslverify'   => false,
				'headers'     => array(
					'Cache-Control' => 'no-cache',
					'Pragma'        => 'no-cache',
					'X-XXXV-Validator' => '1',
				),
			)
		);
		if ( is_wp_error( $resp ) ) {
			return $resp;
		}
		$code = (int) wp_remote_retrieve_response_code( $resp );
		if ( $code < 200 || $code >= 400 ) {
			return new WP_Error( 'xxxv_validate_http', 'Unexpected HTTP status ' . $code . ' fetching the page.' );
		}
		$body = (string) wp_remote_retrieve_body( $resp );
		if ( '' === trim( $body ) ) {
			return new WP_Error( 'xxxv_validate_empty', 'The rendered page returned an empty body.' );
		}
		return $body;
	}

	/**
	 * Fetch a same-host stylesheet body (bounded).
	 *
	 * @param string $href Stylesheet URL.
	 * @return string CSS (possibly empty).
	 */
	private static function fetch_stylesheet( $href ) {
		$resp = wp_remote_get(
			$href,
			array(
				'timeout'     => 8,
				'redirection' => 2,
				'sslverify'   => false,
			)
		);
		if ( is_wp_error( $resp ) ) {
			return '';
		}
		$code = (int) wp_remote_retrieve_response_code( $resp );
		if ( $code < 200 || $code >= 400 ) {
			return '';
		}
		$body = (string) wp_remote_retrieve_body( $resp );
		if ( strlen( $body ) > self::MAX_SHEET_BYTES ) {
			$body = substr( $body, 0, self::MAX_SHEET_BYTES );
		}
		return $body;
	}

	// =====================================================================
	// DOM
	// =====================================================================

	/**
	 * Load HTML into a DOMDocument, UTF-8 safe, suppressing malformed-HTML noise.
	 *
	 * @param string $html HTML.
	 * @return DOMDocument|null
	 */
	private static function load_dom( $html ) {
		if ( ! class_exists( 'DOMDocument' ) ) {
			return null;
		}
		$dom = new DOMDocument();
		$prev = libxml_use_internal_errors( true );
		$loaded = $dom->loadHTML(
			'<?xml encoding="utf-8" ?>' . $html,
			defined( 'LIBXML_NONET' ) ? LIBXML_NONET : 0
		);
		libxml_clear_errors();
		libxml_use_internal_errors( $prev );
		return $loaded ? $dom : null;
	}

	/**
	 * Collect element nodes (bounded) for matching.
	 *
	 * @param DOMXPath $xpath XPath.
	 * @return array DOMElement[]
	 */
	private static function collect_elements( $xpath ) {
		$out   = array();
		$nodes = $xpath->query( '//body//*' );
		if ( ! $nodes ) {
			return $out;
		}
		foreach ( $nodes as $node ) {
			if ( $node instanceof DOMElement ) {
				$out[] = $node;
				if ( count( $out ) >= self::MAX_ELEMENTS ) {
					break;
				}
			}
		}
		return $out;
	}

	/**
	 * Human-friendly path for an element (tag#id.class1.class2).
	 *
	 * @param DOMElement $el Element.
	 * @return string
	 */
	private static function element_path( $el ) {
		$tag = strtolower( $el->nodeName );
		$id  = (string) $el->getAttribute( 'id' );
		$cls = trim( (string) $el->getAttribute( 'class' ) );
		$path = $tag;
		if ( '' !== $id ) {
			$path .= '#' . $id;
		}
		if ( '' !== $cls ) {
			$parts = preg_split( '/\s+/', $cls );
			$parts = array_slice( array_filter( $parts ), 0, 4 );
			if ( $parts ) {
				$path .= '.' . implode( '.', $parts );
			}
		}
		return $path;
	}

	// =====================================================================
	// Stylesheet classification + URL helpers
	// =====================================================================

	/**
	 * Classify a stylesheet as connector / elementor / theme.
	 *
	 * @param string $id   <style> id attribute.
	 * @param string $href <link> href.
	 * @return string
	 */
	private static function classify_source( $id, $href ) {
		$hay = strtolower( $id . ' ' . $href );
		if ( false !== strpos( $hay, 'xxxv-' ) || false !== strpos( $hay, '3xvisibility' ) ) {
			return 'connector';
		}
		if ( false !== strpos( $hay, 'elementor' ) ) {
			return 'elementor';
		}
		// WordPress core block/global styles are not "theme" for our purposes but
		// treating them as theme is fine: if they override a key rule, that IS a
		// conflict the user wants to know about.
		return 'theme';
	}

	private static function origin_host( $url ) {
		$host = wp_parse_url( $url, PHP_URL_HOST );
		return is_string( $host ) ? strtolower( $host ) : '';
	}

	private static function is_same_host( $href, $origin ) {
		if ( 0 === strpos( $href, '/' ) && 0 !== strpos( $href, '//' ) ) {
			return true; // Root-relative -> same host.
		}
		$host = wp_parse_url( $href, PHP_URL_HOST );
		if ( ! is_string( $host ) || '' === $host ) {
			return true; // Relative -> same host.
		}
		return strtolower( $host ) === $origin;
	}

	// =====================================================================
	// CSS parsing
	// =====================================================================

	/**
	 * Parse CSS into a flat list of { selector, body }. Comments are stripped and
	 * at-rule blocks (@media/@supports/@font-face/@keyframes) are skipped so
	 * responsive/conditional rules never cause base-layout false positives.
	 *
	 * @param string $css CSS text.
	 * @return array
	 */
	private static function parse_css_rules( $css ) {
		$css = preg_replace( '#/\*.*?\*/#s', '', (string) $css );
		$rules = array();
		$n = strlen( $css );
		$i = 0;
		while ( $i < $n ) {
			$sel = '';
			while ( $i < $n && '{' !== $css[ $i ] && '}' !== $css[ $i ] ) {
				$sel .= $css[ $i ];
				$i++;
			}
			if ( $i >= $n ) {
				break;
			}
			if ( '}' === $css[ $i ] ) {
				$i++;
				continue;
			}
			$sel = trim( $sel );
			$i++; // Skip '{'.

			if ( '' !== $sel && '@' === $sel[0] ) {
				// Skip the whole at-rule block (respecting nested braces).
				$depth = 1;
				while ( $i < $n && $depth > 0 ) {
					if ( '{' === $css[ $i ] ) {
						$depth++;
					} elseif ( '}' === $css[ $i ] ) {
						$depth--;
					}
					$i++;
				}
				continue;
			}

			$body  = '';
			$depth = 1;
			while ( $i < $n && $depth > 0 ) {
				$c = $css[ $i ];
				if ( '{' === $c ) {
					$depth++;
				} elseif ( '}' === $c ) {
					$depth--;
					if ( 0 === $depth ) {
						$i++;
						break;
					}
				}
				$body .= $c;
				$i++;
			}
			if ( '' !== $sel ) {
				$rules[] = array( 'selector' => $sel, 'body' => $body );
			}
		}
		return $rules;
	}

	/**
	 * Parse a declaration body into prop => { value, important }.
	 *
	 * @param string $body Declaration text.
	 * @return array
	 */
	private static function parse_declarations( $body ) {
		$out = array();
		foreach ( explode( ';', (string) $body ) as $decl ) {
			$decl = trim( $decl );
			if ( '' === $decl || false === strpos( $decl, ':' ) ) {
				continue;
			}
			$pos  = strpos( $decl, ':' );
			$prop = strtolower( trim( substr( $decl, 0, $pos ) ) );
			$val  = trim( substr( $decl, $pos + 1 ) );
			if ( '' === $prop || '' === $val ) {
				continue;
			}
			$important = false;
			if ( preg_match( '/!\s*important\s*$/i', $val ) ) {
				$important = true;
				$val = trim( preg_replace( '/!\s*important\s*$/i', '', $val ) );
			}
			$out[ $prop ] = array( 'value' => $val, 'important' => $important );
		}
		return $out;
	}

	/**
	 * Split a selector list on top-level commas.
	 *
	 * @param string $selector Selector list.
	 * @return array
	 */
	private static function split_selectors( $selector ) {
		$parts = array();
		foreach ( explode( ',', (string) $selector ) as $s ) {
			$s = trim( $s );
			if ( '' !== $s ) {
				$parts[] = $s;
			}
		}
		return $parts;
	}

	/**
	 * Derive key declarations from connector template CSS: (selector, property,
	 * value, important) limited to KEY_PROPS and base (non-state) selectors.
	 *
	 * @param string $css Connector template/critical CSS.
	 * @return array
	 */
	private static function key_declarations( $css ) {
		$key_props = array_flip( self::KEY_PROPS );
		$out  = array();
		$seen = array();
		foreach ( self::parse_css_rules( $css ) as $rule ) {
			foreach ( self::split_selectors( $rule['selector'] ) as $sel ) {
				// Skip interactive/state and pseudo-element selectors.
				if ( preg_match( '/:hover|:focus|:active|:visited|::/i', $sel ) ) {
					continue;
				}
				$decls = self::parse_declarations( $rule['body'] );
				foreach ( $decls as $prop => $info ) {
					if ( ! isset( $key_props[ $prop ] ) ) {
						continue;
					}
					$dedup = $sel . '|' . $prop;
					if ( isset( $seen[ $dedup ] ) ) {
						continue;
					}
					$seen[ $dedup ] = true;
					$out[] = array(
						'selector'  => $sel,
						'property'  => $prop,
						'value'     => $info['value'],
						'important' => $info['important'],
					);
					if ( count( $out ) >= self::MAX_KEY_DECLS ) {
						return $out;
					}
				}
			}
		}
		return $out;
	}

	// =====================================================================
	// Selector engine
	// =====================================================================

	/**
	 * Compute an approximate (a,b,c) specificity as a single sortable integer.
	 *
	 * @param string $sel Complex selector.
	 * @return int
	 */
	private static function specificity( $sel ) {
		// Strip pseudo-elements first so they count as type, not class.
		$s = (string) $sel;
		$ids     = preg_match_all( '/#[\w-]+/', $s );
		$classes = preg_match_all( '/\.[\w-]+/', $s );
		$attrs   = preg_match_all( '/\[[^\]]+\]/', $s );
		$pcls    = preg_match_all( '/(?<!:):[\w-]+/', $s ); // pseudo-classes (single colon)
		$pels    = preg_match_all( '/::[\w-]+/', $s );      // pseudo-elements
		$types   = preg_match_all( '/(^|[\s>+~])([a-zA-Z][\w-]*)/', $s );
		$a = (int) $ids;
		$b = (int) $classes + (int) $attrs + (int) $pcls;
		$c = (int) $types + (int) $pels;
		return $a * 10000 + $b * 100 + $c;
	}

	/**
	 * Convert a complex selector into a sequence of compounds with combinators.
	 * Returns null for unsupported selectors (sibling combinators / empty).
	 *
	 * @param string $sel Complex selector.
	 * @return array|null
	 */
	private static function selector_to_sequence( $sel ) {
		$sel = trim( (string) $sel );
		if ( '' === $sel ) {
			return null;
		}
		if ( false !== strpbrk( $sel, '+~' ) ) {
			return null; // Sibling combinators unsupported.
		}
		$sel = str_replace( '>', ' > ', $sel );
		$parts = preg_split( '/\s+/', $sel );
		$seq   = array();
		$comb  = ' ';
		foreach ( $parts as $p ) {
			if ( '' === $p ) {
				continue;
			}
			if ( '>' === $p ) {
				$comb = '>';
				continue;
			}
			$cmp = self::parse_compound( $p );
			if ( null === $cmp ) {
				return null;
			}
			$seq[] = array( 'c' => $cmp, 'comb' => $comb );
			$comb  = ' ';
		}
		return $seq ? $seq : null;
	}

	/**
	 * Parse a compound selector token into tag/id/classes/attrs (pseudo stripped).
	 *
	 * @param string $p Compound token.
	 * @return array|null
	 */
	private static function parse_compound( $p ) {
		$p = preg_replace( '/::?[\w-]+(\([^)]*\))?/', '', (string) $p );
		$cmp = array( 'tag' => '', 'id' => '', 'classes' => array(), 'attrs' => array() );

		if ( preg_match( '/^(\*|[a-zA-Z][\w-]*)/', $p, $m ) ) {
			$cmp['tag'] = strtolower( $m[1] );
		}
		if ( preg_match_all( '/#([\w-]+)/', $p, $m ) ) {
			$cmp['id'] = end( $m[1] );
		}
		if ( preg_match_all( '/\.([\w-]+)/', $p, $m ) ) {
			$cmp['classes'] = $m[1];
		}
		if ( preg_match_all( '/\[([^\]]+)\]/', $p, $m ) ) {
			foreach ( $m[1] as $raw ) {
				$attr = self::parse_attr( $raw );
				if ( $attr ) {
					$cmp['attrs'][] = $attr;
				}
			}
		}
		if ( '' === $cmp['tag'] && '' === $cmp['id'] && ! $cmp['classes'] && ! $cmp['attrs'] ) {
			// Universal (came from a pseudo-only token like :root) — treat as '*'.
			$cmp['tag'] = '*';
		}
		return $cmp;
	}

	/**
	 * Parse an attribute selector body into name/op/value.
	 *
	 * @param string $raw Inside of [ ... ].
	 * @return array|null
	 */
	private static function parse_attr( $raw ) {
		$raw = trim( $raw );
		if ( preg_match( '/^([\w-]+)\s*([~|^$*]?=)\s*"?([^"\]]*)"?$/', $raw, $m ) ) {
			return array( 'name' => strtolower( $m[1] ), 'op' => $m[2], 'val' => $m[3] );
		}
		if ( preg_match( '/^([\w-]+)$/', $raw, $m ) ) {
			return array( 'name' => strtolower( $m[1] ), 'op' => '', 'val' => '' );
		}
		return null;
	}

	/**
	 * True when a compound matches an element.
	 *
	 * @param DOMElement $el  Element.
	 * @param array      $cmp Compound.
	 * @return bool
	 */
	private static function compound_matches( $el, $cmp ) {
		if ( '' !== $cmp['tag'] && '*' !== $cmp['tag'] && strtolower( $el->nodeName ) !== $cmp['tag'] ) {
			return false;
		}
		if ( '' !== $cmp['id'] && $el->getAttribute( 'id' ) !== $cmp['id'] ) {
			return false;
		}
		if ( $cmp['classes'] ) {
			$class_attr = (string) $el->getAttribute( 'class' );
			$have = $class_attr ? preg_split( '/\s+/', trim( $class_attr ) ) : array();
			$have = array_flip( $have );
			foreach ( $cmp['classes'] as $cls ) {
				if ( ! isset( $have[ $cls ] ) ) {
					return false;
				}
			}
		}
		foreach ( $cmp['attrs'] as $attr ) {
			if ( ! $el->hasAttribute( $attr['name'] ) ) {
				return false;
			}
			if ( '' === $attr['op'] ) {
				continue;
			}
			$actual = (string) $el->getAttribute( $attr['name'] );
			if ( ! self::attr_op_matches( $actual, $attr['op'], $attr['val'] ) ) {
				return false;
			}
		}
		return true;
	}

	private static function attr_op_matches( $actual, $op, $val ) {
		switch ( $op ) {
			case '=':
				return $actual === $val;
			case '~=':
				return in_array( $val, preg_split( '/\s+/', trim( $actual ) ), true );
			case '|=':
				return $actual === $val || 0 === strpos( $actual, $val . '-' );
			case '^=':
				return '' !== $val && 0 === strpos( $actual, $val );
			case '$=':
				return '' !== $val && substr( $actual, -strlen( $val ) ) === $val;
			case '*=':
				return '' !== $val && false !== strpos( $actual, $val );
		}
		return false;
	}

	/**
	 * True when a full selector sequence matches an element (right-to-left).
	 *
	 * @param DOMElement $el  Target element.
	 * @param array      $seq Selector sequence.
	 * @return bool
	 */
	private static function sequence_matches( $el, $seq ) {
		$last = count( $seq ) - 1;
		if ( $last < 0 ) {
			return false;
		}
		if ( ! self::compound_matches( $el, $seq[ $last ]['c'] ) ) {
			return false;
		}
		$cur = $el;
		for ( $i = $last; $i > 0; $i-- ) {
			$comb = $seq[ $i ]['comb']; // relation between compound i and i-1
			$left = $seq[ $i - 1 ]['c'];
			if ( '>' === $comb ) {
				$parent = $cur->parentNode;
				if ( ! ( $parent instanceof DOMElement ) || ! self::compound_matches( $parent, $left ) ) {
					return false;
				}
				$cur = $parent;
			} else {
				$found = false;
				$p = $cur->parentNode;
				while ( $p instanceof DOMElement ) {
					if ( self::compound_matches( $p, $left ) ) {
						$cur   = $p;
						$found = true;
						break;
					}
					$p = $p->parentNode;
				}
				if ( ! $found ) {
					return false;
				}
			}
		}
		return true;
	}

	/**
	 * Find all elements matching a selector sequence (bounded).
	 *
	 * @param array $elements DOMElement[]
	 * @param array $seq      Selector sequence.
	 * @return array DOMElement[]
	 */
	private static function match_elements( $elements, $seq ) {
		$out = array();
		foreach ( $elements as $el ) {
			if ( self::sequence_matches( $el, $seq ) ) {
				$out[] = $el;
				if ( count( $out ) >= 40 ) {
					break;
				}
			}
		}
		return $out;
	}

	/**
	 * Determine the winning declaration for a property on an element using real
	 * cascade order: importance > specificity > source order.
	 *
	 * @param array      $rules Flat rule list.
	 * @param DOMElement $el    Element.
	 * @param string     $prop  Property.
	 * @return array|null { src, sel, value, important, spec, order }
	 */
	private static function cascade_winner( $rules, $el, $prop ) {
		$winner = null;
		foreach ( $rules as $rule ) {
			if ( ! isset( $rule['decls'][ $prop ] ) ) {
				continue;
			}
			if ( ! self::sequence_matches( $el, $rule['seq'] ) ) {
				continue;
			}
			$decl = $rule['decls'][ $prop ];
			$cand = array(
				'src'       => $rule['src'],
				'sel'       => $rule['sel'],
				'value'     => $decl['value'],
				'important' => $decl['important'],
				'spec'      => $rule['spec'],
				'order'     => $rule['order'],
			);
			if ( null === $winner || self::beats( $cand, $winner ) ) {
				$winner = $cand;
			}
		}
		return $winner;
	}

	/**
	 * True when candidate a wins the cascade over current winner b.
	 */
	private static function beats( $a, $b ) {
		if ( $a['important'] !== $b['important'] ) {
			return $a['important'];
		}
		if ( $a['spec'] !== $b['spec'] ) {
			return $a['spec'] > $b['spec'];
		}
		return $a['order'] >= $b['order'];
	}

	/**
	 * Explain why a theme rule overrides the connector rule.
	 */
	private static function conflict_reason( $kd, $winner ) {
		if ( $winner['important'] && ! $kd['important'] ) {
			return 'Theme rule uses !important while the connector rule does not.';
		}
		$kspec = self::specificity( $kd['selector'] );
		if ( $winner['spec'] > $kspec ) {
			return 'Theme selector has higher specificity than the connector selector.';
		}
		if ( $winner['spec'] === $kspec ) {
			return 'Theme rule has equal specificity but loads after the connector CSS.';
		}
		return 'Theme rule wins the cascade on this element.';
	}
}

/**
 * Lightweight logger bridge so the validator can record outcomes in the same
 * debug ring-buffer without exposing XXXV_Elementor::log().
 *
 * @param int  $post_id   Page ID.
 * @param bool $ok        Whether validation passed.
 * @param int  $conflicts Conflict count.
 * @param int  $missing   Missing-rule count.
 */
function XXXV_Elementor_Validator_log( $post_id, $ok, $conflicts, $missing ) {
	$log = get_option( 'xxxv_debug_log', array() );
	if ( ! is_array( $log ) ) {
		$log = array();
	}
	$log[] = array(
		'time'    => current_time( 'mysql' ),
		'level'   => $ok ? 'info' : 'warning',
		'message' => 'Post-publish render validation: ' . ( $ok ? 'passed' : 'issues found' ),
		'context' => array(
			'post_id'   => (int) $post_id,
			'conflicts' => (int) $conflicts,
			'missing'   => (int) $missing,
		),
	);
	if ( count( $log ) > 50 ) {
		$log = array_slice( $log, -50 );
	}
	update_option( 'xxxv_debug_log', $log, false );
}
