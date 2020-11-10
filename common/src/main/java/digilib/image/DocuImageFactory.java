package digilib.image;

/*-
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2001 - 2020 digilib Community
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
 */

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


/**
 * Static factory for DocuImages.
 * 
 * @author casties
 * 
 */
public class DocuImageFactory {
    /** Log4J logger */
    protected static Logger logger = LoggerFactory.getLogger(DocuImageFactory.class);

    /** AuthOps implementation class */
    protected static Class<DocuImage> docuImageClass;

    /**
     * Creates a new DocuImage instance.
     * 
     * The type of DocuImage is specified by docuimage-class.
     * 
     * @return DocuImage
     */
    public static DocuImage getInstance() {
        DocuImage di = null;
        try {
            di = docuImageClass.getConstructor().newInstance();
        } catch (Exception e) {
            logger.error("Unable to create DocuImage instance!", e);
        }
        return di;
    }

    /** set the DocuImage implementation class.
     * @param clazz the implementation class
     */
    public static void setDocuImageClass(Class<DocuImage> clazz) {
        DocuImageFactory.docuImageClass = clazz;
    }

}
