/* DocuImage -- General image interface class implementation

  Digital Image Library servlet components

  Copyright (C) 2001, 2002 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA

*/

package digilib.image;

import java.io.*;
import javax.servlet.ServletResponse;

import digilib.*;
import digilib.io.*;

/** Simple abstract implementation of the <code>DocuImage</code> interface.
 *
 * This implementation provides basic functionality for the utility methods like
 * <code>SetUtils</code>, and <code>getKnownFileTypes</code>. Image methods like
 * <code>loadImage</code>, <code>writeImage</code>, <code>getWidth</code>,
 * <code>getHeight</code> and <code>cropAndScale</code> must be implemented by
 * derived classes.
 */
public abstract class DocuImageImpl implements DocuImage {

  /** Internal utils object. */    
  protected Utils util = null;

  /** Default constructor. */  
  public DocuImageImpl() {
    util = new Utils();
  }

  /** Contructor taking an utils object.
   * 
   * @param u Utils object.
   */  
  public DocuImageImpl(Utils u) {
    util = u;
  }

  /** Set local Utils object.
   * 
   * @param u Utils object.
   */  
  public void setUtils(Utils u) {
    util = u;
  }

  /** Internal knownFileTypes. */  
  protected String[] knownFileTypes = {"jpg", "png", "gif", "tiff"};

  /** Returns the list of image file types known to the DocuImage implementation.
   * 
   * @return List of image file types. Strings are standard file extensions.
   */    
  public String[] getKnownFileTypes() {
    return knownFileTypes;
  }


  public abstract void loadImage(File f) throws FileOpException;
  public abstract void writeImage(String mt, ServletResponse res) throws FileOpException;
  public abstract int getWidth();
  public abstract int getHeight();
  public abstract void cropAndScale(int x_off, int y_off, int width, int height, float scale, int qual)  throws ImageOpException;
}
