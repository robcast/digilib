# Directory layout for images

In digilib all images are identified by the `fn` and (optional) `pn` parameters. 
The value for `fn` can be a directory path or a directory path and a filename, 
separated by slashes, e.g. "`fn=books/book1/page0002`".

If `fn` is a directory path without filename `pn` is the index number of the 
image files in this directory in alphabetical order, e.g.
"`fn=books/book1&pn=2`". The default for `pn` is 1 i.e. the first image. 

If `fn` ends in a filename `pn` is ignored. File extensions are also ignored,
i.e. "`books/book1/page0002`" and "`books/book1/page0002.tif`" identify the same 
image. It is recommended to omit the file extension.

The directory path in `fn` is relative to the base directory in the `basedir-list`
parameter of the `digilib-config.xml` file, e.g. if

	<parameter name="basedir-list" value="/docuserver/images" />

and

	fn=books/book1/page0002

then digilib will try to load the file

	/docuserver/images/books/book1/page0002.tif
	
(automatically finding the right file extension)
	

## Prescaled images

You can provide any number of scaled-down versions of your images that
digilib can use when a smaller version of an image is requested. Since less data
has to be read and processed this can speed up digilib's performance considerably.

The actual process is that the client requests a certain target size,
digilib scans all available scaled-down versions of the same image, selects the
smallest image that is larger than the requested size and scales it down to the
requested size.

There is another optimization in digilib: if the requested image is *exactly*
the same size and type as the pre-scaled image then the pre-scaled image is sent
unmodified to the client which is a lot faster. So it makes sense to produce
thumbnails of exactly 90 pixel width when they are used in an HTML page where
all images are 90 pixel wide.

The scaled-down versions of the image have to have the same file name as
the original hi-res file. They can have a different type and extension (e.g.
`img002.jpg` for `img002.TIFF`)

The scaled down images have to have the same directory path (the part that
shows up in digilib's "fn" parameter) as the hi-res file wile the first part of each
directory tree is configured by the `basedir-list` parameter in
`digilib-config.xml`.

The sequence of directories in `basedir-list` is from high-res to low-res.
Images must be present in the hires directory but they need not be present in
all lower-res directories.

e.g. if digilib-config.xml contains

	<parameter name="basedir-list" value="/images:/scaled:/thumb" />

and a user requests the image `books/book1/page0002` digilib looks for

1. `/thumb/books/book1/page0002.jpg`
2. `/scaled/books/book1/page002.jpg`
3. `/images/books/book1/page002.tif`

(automatically finding the right file extension) 
and uses the first image that is bigger than or equal to the requested size.

For batch-prescaling our images we use a script called "scale-o-mat" that uses a
lot of freely available imaging libraries (ImageMagick, libtiff, netpbm) and is
available in our public CVS [[1]](http://itgroup.mpiwg-berlin.mpg.de/cgi-bin/cvsweb.cgi/scaleomat/). 
The script is given a
hi-res base directory, a destination base directory, a destination size and a
starting directory. It then processes all files in the starting directory and
all its subdirectories and creates scaled images in corresponding directories
under the destination base directory.

We currently use prescaled thumbnails of 100 pixels and images for browser
display of 1500 pixels. Remember that the prescaled image has to be larger (or
the same size) than the requested image size!
