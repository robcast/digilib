/* ParameterMap.java -- HashMap of Parameters.

  Digital Image Library servlet components

  Copyright (C) 2003 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

 * Created on 02.09.2003 by casties
 *
 */
package digilib.servlet;

import java.util.HashMap;

/** HashMap of digilib.servlet.Parameter's.
 * 
 * Keys are Strings. Values are Parameters.
 * 
 * @author casties
 *
 */
public class ParameterMap extends HashMap {

	
	/** Default constructor.
	 * 
	 */
	public ParameterMap() {
		super();
	}

	/** Construcotr with initial size.
	 * @param arg0
	 */
	public ParameterMap(int arg0) {
		super(arg0);
	}

	/** Get the Parameter with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key
	 * @return
	 */
	public Parameter get(String key) {
		return (Parameter) super.get(key);
	}

	/** Get the Parameter with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key
	 * @return
	 */
	public Object getValue(String key) {
		Parameter p = (Parameter) super.get(key);
		return (p != null) ? p.getValue() : null;
	}
	
	/** Get the Parameter with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key
	 * @return
	 */
	public String getAsString(String key) {
		Parameter p = (Parameter) super.get(key);
		return (p != null) ? p.getAsString() : null;
	}

	/** Get the Parameter with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key
	 * @return
	 */
	public int getAsInt(String key) {
		Parameter p = (Parameter) super.get(key);
		return (p != null) ? p.getAsInt() : 0;
	}

	/** Get the Parameter with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key
	 * @return
	 */
	public float getAsFloat(String key) {
		Parameter p = (Parameter) super.get(key);
		return (p != null) ? p.getAsFloat() : 0f;
	}

	/** Get the Parameter with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key
	 * @return
	 */
	public boolean getAsBoolean(String key) {
		Parameter p = (Parameter) super.get(key);
		return (p != null) ? p.getAsBoolean() : false;
	}

	/** Returns if the Parameter's value has been set.
	 * 
	 * @param key
	 * @return
	 */
	public boolean hasValue(String key) {
		Parameter p = (Parameter) super.get(key);
		return (p != null) ? p.hasValue() : false;
	}
	
	/** Add the Parameter to the map with a certain key.
	 * 
	 * Returns the value that was previously associated with key. 
	 * 
	 * @param key
	 * @param val
	 * @return
	 */
	public Parameter put(String key, Parameter val) {
		return (Parameter) super.put(key, val);
	}

	/** Add the Parameter val to the map, using val's name.
	 * 
	 * Returns the value that was previously associated with val's name. 
	 * 
	 * @param val
	 * @return
	 */
	public Parameter put(Parameter val) {
		return (Parameter) super.put(val.getName(), val);
	}
	
	/** Add a new Parameter with name, default and value.
	 * 
	 * Returns the key that was previously associated with name. 
	 * 
	 * @param name
	 * @param def
	 * @param val
	 * @return
	 */
	public Parameter newParameter(String name, Object def, Object val) {
		Parameter p = new Parameter(name, def, val);
		return (Parameter) super.put(name, p);
	}

	/** Add a new Parameter with name, default, value and type.
	 * 
	 * Returns the key that was previously associated with name. 
	 * 
	 * @param name
	 * @param def
	 * @param val
	 * @param type
	 * @return
	 */
	public Parameter newParameter(String name, Object def, Object val, int type) {
		Parameter p = new Parameter(name, def, val, type);
		return (Parameter) super.put(name, p);
	}

	/** Set the value of an existing parameter.
	 * 
	 * Sets the value and returns true if the parameter exists.
	 * 
	 * @param key
	 * @param val
	 * @return
	 */
	public boolean setValue(String key, Object val) {
		Parameter p = get(key);
		if (p != null) {
			p.setValue(val);
			return true;
		}
		return false;
	}

	/** Set the value of an existing parameter.
	 * 
	 * Sets the value and returns true if the parameter exists.
	 * 
	 * @param key
	 * @param val
	 * @return
	 */
	public boolean setValue(String key, int val) {
		Parameter p = get(key);
		if (p != null) {
			p.setValue(val);
			return true;
		}
		return false;
	}

	/** Set the value of an existing parameter.
	 * 
	 * Sets the value and returns true if the parameter exists.
	 * 
	 * @param key
	 * @param val
	 * @return
	 */
	public boolean setValue(String key, float val) {
		Parameter p = get(key);
		if (p != null) {
			p.setValue(val);
			return true;
		}
		return false;
	}

	/** Set the value of an existing parameter.
	 * 
	 * Sets the value and returns true if the parameter exists.
	 * 
	 * @param key
	 * @param val
	 * @return
	 */
	public boolean setValueFromString(String key, String val) {
		Parameter p = get(key);
		if (p != null) {
			p.setValueFromString(val);
			return true;
		}
		return false;
	}
}
