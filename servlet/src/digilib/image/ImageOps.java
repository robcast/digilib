/* ImageOps -- convenience methods for images
 
 Digital Image Library servlet components
 
 Copyright (C) 2004 Robert Casties (robcast@mail.berlios.de)
 
 This program is free software; you can redistribute  it and/or modify it
 under  the terms of  the GNU General  Public License as published by the
 Free Software Foundation;  either version 2 of the  License, or (at your
 option) any later version.
 
 Please read license.txt for the full details. A copy of the GPL
 may be found at http://www.gnu.org/copyleft/lgpl.html
 
 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307 USA
 
 * Created on 13.10.2004
 */
package digilib.image;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.util.Iterator;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import javax.media.jai.JAI;
import javax.media.jai.RenderedOp;

import org.apache.log4j.Logger;
import org.marcoschmidt.image.ImageInfo;

import digilib.io.FileOpException;
import digilib.io.FileOps;
import digilib.io.ImageFile;
import digilib.io.ImageFileset;

/**
 * convenience methods for images
 *
 * @author casties
 */
public class ImageOps {
    
    private static Logger logger = Logger.getLogger(ImageOps.class);
    
    public static final int TYPE_AUTO = 0;
    public static final int TYPE_JPEG = 1;
    public static final int TYPE_PNG = 2;
    
    private static DocuImage docuImg;
    
    public static boolean checkFile(ImageFile imgf) throws IOException {
        return docuImg.identify(imgf);
    }
    
    public static void setDocuImage(DocuImage di) {
        docuImg = di;
    }
    
    public static DocuImage getDocuImage() {
        return docuImg;
    }
}
