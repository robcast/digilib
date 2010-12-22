/* ImageInput-- digilib image input interface.

  Digital Image Library servlet components

  Copyright (C) 2010 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA

 * Created on 20.12.2010
 */

package digilib.io;

import digilib.image.ImageSize;

public abstract class ImageInputImpl implements ImageInput {

	// mime file type
	protected String mimetype = null;
	// image size in pixels
	protected ImageSize pixelSize = null;

	/* (non-Javadoc)
     * @see digilib.io.ImageInput#getSize()
     */
	@Override
    public ImageSize getSize() {
		return pixelSize;
	}

	/* (non-Javadoc)
     * @see digilib.io.ImageInput#setSize(digilib.image.ImageSize)
     */
	@Override
    public void setSize(ImageSize imageSize) {
		this.pixelSize = imageSize;
	}

	/* (non-Javadoc)
     * @see digilib.io.ImageInput#getMimetype()
     */
	@Override
    public String getMimetype() {
		return mimetype;
	}

	/* (non-Javadoc)
     * @see digilib.io.ImageInput#setMimetype(java.lang.String)
     */
	@Override
    public void setMimetype(String filetype) {
		this.mimetype = filetype;
	}

	/* (non-Javadoc)
     * @see digilib.io.ImageInput#isChecked()
     */
	@Override
    public boolean isChecked() {
		return (pixelSize != null);
	}
	
	/* (non-Javadoc)
     * @see digilib.io.ImageInput#getAspect()
     */
	@Override
    public float getAspect() {
		return (pixelSize != null) ? pixelSize.getAspect() : 0;
	}
	
}