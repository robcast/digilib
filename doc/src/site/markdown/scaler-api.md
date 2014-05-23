# The digilib Scaler API

The Scaler servlet takes parameters in the HTTP query string format:

	http://host.domain/digilib/Scaler/request_path/?param1=value1&param2=value2&... 

Unknown parameters will be silently ignored.

Recognised parameters (as of Version 2.2.2, for the most recent list of 
parameters 
[use the source](https://sourceforge.net/p/digilib/code/ci/default/tree/servlet/src/main/java/digilib/conf/DigilibServletRequest.java)
):

- `request_path`: (optional) path to file or directory.
- `fn`: path to file or directory. (This path will be added to
    `request_path`. Either parameter can be empty. 
    All paths are relative to the configured base directory 
    from the [digilib-config.xml](digilib-config.html) parameter `basedir-list`). 
- `pn`: page number. Index into the (alphabetically sorted)
    directory given by the path. Starts with 1. Ignored if the path
    points to a file. Default: 1.
- `dw`: destination image width (pixels). If omitted the image is
    scaled to fit `dh.`
- `dh`: destination image height (pixels). If omitted the image
    is scaled to fit `dw`.
- `wx`: relative x offset of the image area to be sent (0 <=
    `wx` <= 1). Default: 0.
- `wy`: relative y offset of the image area to be sent (0 <=
    `wy` <= 1). Default: 0.
- `ww`: relative width of the image area to be sent (0 <= `ww`
    <= 1). Default: 1.
- `wh`: relative height of the image area to be sent (0 <= `wh`
    <= 1). Default: 1.
- `ws`: additional scaling factor. The resulting image will have
    the size \[`ws`\*`dw` x `ws`\*`dh`\]. Default: 1.
- `cont`: change contrast of the image. Negative values reduce
    contrast, positive values enhance contrast. Each pixel value is
    multiplied by 2^`cont`. Default: 0
- `brgt`: change brightness of image. Negative value reduces
    brightness, positive value enhances brightness. The value `brgt` is
    added to each pixel value. Default: 0
- `rot`: rotate image. Rotation angle is given in degrees.
    Default: 0
- `rgbm`: modify colour by multiplication. The contrast of the
    red green and blue components of the image can be reduced or
    enhanced similar to the `cont` parameter. The factors for red, green
    and blue are separated by slashes (e.g. `0.86/0/-0.5`).
    Default: `0/0/0`
- `rgba`: modify colour by addition. The brightness of the red
    green and blue components of the image can be reduced or enhanced
    similar to the `brgt` parameter. The factors for red, green and blue
    are separated by slashes (e.g. `100/0/25`). Default: `0/0/0`
- `ddpi`: resolution of client display for `osize` mode. Either
    `ddpi` or `ddpix` and `ddpiy` must be set to use `osize` mode.
- `ddpix`: resolution of client display in x direction for
    `osize` mode.
- `ddpiy`: resolution of client display in y direction for
    `osize` mode.
- `scale`: absolute scale factor applied to the highest resolution image
    for `ascale` mode.
- `colop`: color operation. One of "GRAYSCALE" (produces grayscale 
    image), "NTSC\_GRAY" (uses NTSC formula to produce grayscale image), 
    "INVERT" (inverts colors), "MAP\_GRAY\_BGR" (produces false-color image 
    mapping brightness values to color scale from blue via green to red).
- `mo`: list of flags for the mode of operation separated by comma ",".
    - `fit`: always scale the image to fit \[`dw` x `dh`\] (default).
    - `clip`: send the file in its original resolution, cropped
        to fit \[`dw` x `dh`\].
    - `osize`: scale to original size based on image
        resolution (from the image metadata) and display resolution
        (from parameter ddpi). Fails if either resolution is unknown.
    - `ascale`: scale the highest resolution image by an absolute
    	factor given by the `scale` parameter.
    - `file`: send the file as-is (may be very large and all
        sorts of image types!). If the configuration doesn't allow sending
        files (`sendfile-allowed=false`) revert to `clip`.
    - `rawfile`: send the file as-is with a mime-type of
        "application/octet-stream" so the browser presents a download dialog.
    - `errtxt`: send error response as plain text.
    - `errimg`: send error response as image (default).
    - `errcode`: send error response as HTTP status code.
    - `q0`-`q2`: quality of interpolation in scaling (q0:
        worst, q2 best).
    - `lores`: try to use pre-scaled images (default)
    - `hires`: only use the highest resolution image.
    - `vmir`: mirror image vertically.
    - `hmir`: mirror image horizontally.
    - `jpg`: the resulting image is always sent as JPEG
        (otherwise TIFF and PNG images are sent as PNG).
    - `png`: the resulting image is always sent as PNG
        (otherwise JPEG and J2K images are sent as JPEG).

The image to be loaded is specified by the `request_path`
(deprecated) and/or the `fn` parameter (preferred) and the optional
index `pn`:

- if `fn` points to a directory then the file with the index `pn`
    (in alphabetical order according to ASCII) will be loaded
- if `fn` points to a file (with or without extension) then this
    file will be loaded (regardless of `pn`).

Find more information on the directory layout [here](image-directories.html).

The image will always be scaled equally in horizontal and vertical direction,
preserving the aspect ratio,
such that the resulting image does not exceed the rectangle \[`dw` x `dh`\].

If only either height or width is given the image is scaled to match
only the given dimension. The size of the resulting image in the other
dimension is determined by the aspect ratio of the image.
