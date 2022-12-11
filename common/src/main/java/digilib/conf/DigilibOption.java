package digilib.conf;

/*
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2016 - 2017 digilib Community
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 * Author: Robert Casties (robcast@users.sourceforge.net)
 */

/**
 * Enum of options for the digilib "mo" parameter.
 * 
 * @author casties
 *
 */
public enum DigilibOption {
	/**
	 * scale the (selected area of the) image proportionally to fit inside [dw x
	 * dh], preserving its aspect ratio (default).
	 */
	fit,
	/**
	 * scale the (selected area of the) image to fill [dw x dh], changing its
	 * aspect ratio.
	 */
	squeeze,
	/**
	 * scale the (selected area of the) image proportionally to fill [dw x dh]
	 * with the shorter side, cropping the longer side.
	 */
	crop,
	/**
	 * scale the (selected area of the) image proportionally to fill [dw x dh]
	 * with the longer side, filling out the image on the shorter side if
	 * possible.
	 */
	fill,
	/** send the file in the highest resolution, cropped to fit [dw x dh]. */
	clip,
	/**
	 * scale to original size based on image resolution (from the image
	 * metadata) and display resolution (from parameter ddpi). Fails if either
	 * resolution is unknown.
	 */
	osize,
	/**
	 * scale the highest resolution image by an absolute factor given by the
	 * scale parameter.
	 */
	ascale,
	/**
	 * send the file as-is (may be very large and all sorts of image types!). If
	 * the configuration doesn’t allow sending files (sendfile-allowed=false)
	 * revert to clip.
	 */
	file,
	/**
	 * send the file as-is with a mime-type of "application/octet-stream" so the
	 * browser presents a download dialog.
	 */
	rawfile,
	/** send error response as plain text. */
	errtxt,
	/** send error response as image (default). */
	errimg,
	/** send error response as HTTP status code. */
	errcode,
	/** quality of interpolation in scaling (q0: worst, q3 best). */
	q0,
	/** quality of interpolation in scaling (q0: worst, q3 best). */
	q1,
	/** quality of interpolation in scaling (q0: worst, q3 best). */
	q2,
	/** quality of interpolation in scaling (q0: worst, q3 best). */
	q3,
	/** only use the highest resolution image. */
	hires,
	/**
	 * use the pre-scaled image that is bigger than the requested size
	 * (default).
	 */
	autores,
	/** prefer the next-smaller pre-scaled image. */
	lores,
	/** mirror image vertically. */
	vmir,
	/** mirror image horizontally. */
	hmir,
	/**
	 * the resulting image is always sent as JPEG (otherwise TIFF and PNG images
	 * are sent as PNG).
	 */
	jpg,
	/**
	 * the resulting image is always sent as PNG (otherwise JPEG and J2K images
	 * are sent as JPEG).
	 */
	png,
	/**
	 * interpret wx, wy, ww, wh as pixel coordinates on the highest resolution
	 * image.
	 */
	pxarea,
	/**
	 * select square image region from the full image (short side of the image)^2. 
	 */
	sqarea,
	/** send IIIF image info (instead of image). */
	info,
	/** send redirect to IIIF image info URI */
	redirect_info,
	/** dirInfo returns directory contents */
	dir,
	/** disallow upscaling in IIIF V3 */
	deny_upscale
}
