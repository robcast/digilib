/**
 * 
 */
package digilib.util;

import java.util.HashSet;
import java.util.StringTokenizer;

/**
 * @author casties
 *
 */
@SuppressWarnings("serial")
public class OptionsSet extends HashSet<String> {

	protected String optionSep = ",";
	
	public OptionsSet() {
		super();
	}

	/** Constructor with String of options.
	 * @param s
	 */
	public OptionsSet(String s) {
		super();
		parseString(s);
	}

	/** Adds all options from String to Set.
	 * @param s
	 */
	public void parseString(String s) {
		if (s != null) {
			StringTokenizer i = new StringTokenizer(s, optionSep);
			while (i.hasMoreTokens()) {
				String opt = i.nextToken();
				this.add(opt);
			}
		}
	}
	
	public boolean hasOption(String opt) {
		return this.contains(opt);
	}

	public String toString() {
		StringBuffer b = new StringBuffer();
		for (String s: this) {
			if (b.length() > 0) {
				b.append(optionSep);
			}
			b.append(s);			
		}
		return b.toString();
	}
	
	
	public String getOptionSep() {
		return optionSep;
	}

	public void setOptionSep(String optionSep) {
		this.optionSep = optionSep;
	}

}
