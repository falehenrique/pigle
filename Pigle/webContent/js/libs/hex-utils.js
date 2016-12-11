function int2hex ( int, digits )
{
	var result = int.toString(16);

	if ( digits )
	{
		var tmp = result.split ( "x" );

		var value = "" + tmp [ tmp.length - 1 ];

		while ( value.length < ( 2 * digits ) )
		{
			value = "0" + value;
		}

		result = "0x" + value;
	}

	return result;
}

function hex2int ( hex )
{
	return parseInt ( hex, 16 );
}
