function tlv2html ( tlv )
{
	var liTag = document.createElement ( "li" );
	var spanTag = document.createElement ( "span" );

	if ( tlv.children && ( tlv.children.length > 0 ) )
	{
		spanTag.appendChild ( document.createTextNode ( tlv.tag ) );
		spanTag.className = "tag";

		liTag.appendChild ( spanTag );

		var ulTag = document.createElement ( "ul" );

		for ( var i = 0; i < tlv.children.length; i++ )
		{
			ulTag.appendChild ( this.tlv2html ( tlv.children [ i ] ) );
		}

		liTag.appendChild ( ulTag );
	}
	else
	{
		var dataTag = document.createElement ( "span" );

		spanTag.appendChild ( document.createTextNode ( tlv.tag + ":" ) );
		spanTag.className = "tag";

		dataTag.appendChild ( document.createTextNode ( JSON.stringify ( tlv.data, null, " " ) ) );
		dataTag.className = "data";

		liTag.appendChild ( spanTag );
		liTag.appendChild ( dataTag );
	}

	return liTag;
};