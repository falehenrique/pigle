
	// Instance variables: Read code for further details
	_amount = 0;
	_percentDiscount = 10;
	_amountWithDiscount = 0;
	_tlv = null;
	_tlvAmountTag = null;
	_tlvCurrencyTag = null;
	_currencyInfo = null;

	_isPaymentTransaction = false;
	
	var serviceStartEnd = tetra
	.startEnd();


var showView = function ( vid )
{
	var views = [ "listening", "on-start", "on-end" ];

	for ( var i = 0; i < views.length; i++ )
	{
		document.getElementById( views [ i ] ).className = ( vid == views [ i ] ? "" : "hidden" );
	}
};
var reset = function()
{
	// Default discount
	_amount = 200;
	_percentDiscount = 0;
	_amountWithDiscount = Math.round ( _amount * ( 1 - ( _percentDiscount / 100 ) ) );
};


		

var _setAmount = function ( amount )
{
	_amount = amount;
	//_processDiscount();
};

var _setDiscountPercent = function ( percent )
{
	_percentDiscount = percent;
	//_processDiscount();
};

var _onDiscountChange = function()
{
	parse();
	refreshView();
};

var parse = function()
{
	_percentDiscount = document.getElementById( "discount-slider" ).value;
	//_processDiscount();
};


var verifyuser = function()
{
	var root = 'https://389bbd29.ngrok.io/api/get-user';

	$.ajax({
	  url: root,
	  method: 'GET'
	}).then(function(data) {
	  console.log(data.success);
	  console.log(data.message);
	  return data;
	});
}

var dataP = null;

var refreshView = function()
{
	var valueTotal =  _amount;
	var root = 'https://389bbd29.ngrok.io/api/get-user?card_number=56';
	$.ajax({
	  url: root,
	  method: 'GET'
	}).then(function(data) {
		console.log(data.success);
		console.log(data.message);

		dataP = data;

		if (data.success) {
			var totalValue = Math.ceil(_formatAmount(_amount));
			document.getElementById( "discount-value" ).innerHTML =  totalValue.toFixed(2);
			document.getElementById( "on-start-amount-value-investiment" ).innerHTML = (totalValue - _formatAmount(_amount)).toFixed(2);
		} else {
			document.getElementById( "on-start-amount-value-investiment" ).style.display = "none";
		}
	});

	document.getElementById( "on-start-amount-value" ).innerHTML = _formatAmount (_amount);
	document.getElementById( "discount-value" ).innerHTML = _formatAmount ( valueTotal );

	var currencyCodeNodes = document.getElementById( "on-start" ).querySelectorAll ( ".currency-code" );

	for ( var i = 0; i < currencyCodeNodes.length; i++ )
	{
		currencyCodeNodes [ i ].innerHTML = _currencyInfo.code;
	}
};

var _processEvalluation = function(evalluation)
{
	//_amountWithDiscount = Math.round ( _amount * ( 1 - ( _percentDiscount / 100 ) ) );
	_tlvAmountTag.data = "" + _amount;

	if (evalluation != undefined && evalluation != "") {

		console.info("vai chamar block");

		var root = 'https://389bbd29.ngrok.io/api/update-evaluation?value='+evalluation;

		$.ajax({
		  url: root,
		  method: 'GET'
		}).then(function(data) {
		  console.log(data.success);
		  console.log(data.message);
		  return data;
		});
	}

};

var _formatAmount = function ( amount )
{
	var decimalPosition = parseInt ( _tlvCurrencyExponentTag.data );

	var base = Math.pow ( 10, decimalPosition );

	var int = "" + parseInt ( amount / base ), decimal = "" + ( amount % base );

	while ( decimal.length < decimalPosition )
	{
		decimal = "0" + decimal;
	}

	var result = [ int, decimal ].join ( "." );

	return result
};


var registerPurchase = function()
{
	var root = 'https://389bbd29.ngrok.io/api/register-purchase';


	var formData = {
        seller_id: "RESTAURANTE",
        total_value: document.getElementById( "on-start-amount-value" ).innerHTML,
        investiment_value: document.getElementById( "on-start-amount-value-investiment" ).innerHTML,
        card_number: "27"
    };
 
	$.ajax({
	    url : 'https://389bbd29.ngrok.io/api/register-purchase',
	    type: "POST",
	    data : formData,
	    success: function(data, textStatus, jqXHR)
	    {
	        console.info("Data: " + data + "\nStatus: " + status);
	    }
	});
}

var _showEndTransactionStatus = function()
{
	var endStatusTags = _tlv.filter ( function ( el, index ){
		if ( el.tag === "0x9F94891D" )
		{
			return true;
		}
		return false;
	} );

	// Default status: Should never be displayed...
	var statusId = "unknown";

	if ( endStatusTags.length > 0 )
	{
		var endStatusTag = endStatusTags [ 0 ];

		var statusCodesWithErrorIDs = [
			{ tag: "0000016D", status: "transaction-completed-approved" },
			{ tag: "0000016E", status: "transaction-completed-declined" },
			{ tag: "00000170", status: "transaction-terminated-errors" },
			{ tag: "0000016F", status: "transaction-aborted" },
			{ tag: "00000171", status: "presented-card-not-supported" },
			{ tag: "00000110", status: "presented-card-is-blocked" },
			{ tag: "00000172", status: "no-card-detected" },
			{ tag: "00000101", status: "internal-invalid-object" },
			{ tag: "00000105", status: "not-authorized" },
			{ tag: "00000108", status: "missing-data" },
			{ tag: "00000109", status: "rng-error" },
			{ tag: "00000120", status: "lib-interface-error" },
			{ tag: "00000102", status: "memory-error" },
			{ tag: "0000FFFE", status: "internal-error" }
		];

		var results = statusCodesWithErrorIDs.filter( function ( el, index ){
			if ( el.tag === endStatusTag.data )
			{
				if (dataP.success) {
					console.info("Ativo");
					registerPurchase();
				} else {
					console.info("não ativo");
				}

				return true;
			}
			return false;
		} );

		if ( results.length > 0 )
		{
			statusId = results [ 0 ].status;
		}
	}

	var statusNodes = document.getElementById( "on-end" ).querySelectorAll( "fieldset [status-id]" );

	for ( var i = 0; i < statusNodes.length; i++ )
	{
		if ( statusNodes [ i ].getAttribute ( "status-id" ) == statusId )
		{
			statusNodes [ i ].className = "";
		}
		else
		{
			statusNodes [ i ].className = "hidden";
		}
	}

};





serviceStartEnd
.on('SE_START',function(tlv) {

				tetra.weblet.show();

				_tlv = tlv;

				console.log ( "SE_START: before processing", tlv );

				reset();

				showView ( "on-start" );

				// Transaction type tag

				var transactionTypeTag = tlv.filter ( function ( el, index ){
					if ( el.tag === "0x9F948919" )
					{
						return true;
					}
					return false;
				} );

				// Should never happen...
				if ( transactionTypeTag.length == 0 )
				{
					this.sendResponse ( _tlv );
					return;
				}

				_isPaymentTransaction = ( transactionTypeTag [ 0 ].data === "00000000" );

				// Amount tag
				var amountTags = tlv.filter ( function ( el, index ){
					if ( el.tag === "0x9F02" )
					{
						return true;
					}
					return false;
				} );

				// Should never happen...
				if ( amountTags.length == 0 )
				{
					this.sendResponse ( _tlv );
					return;
				}

				// Currency code tag
				var currencyTags = tlv.filter ( function ( el, index ){
					if ( el.tag === "0x5F2A" )
					{
						return true;
					}
					return false;
				} );

				if ( currencyTags.length == 0 )
				{
					this.sendResponse ( _tlv );
					return;
				}

				// Currency exponent tag
				var currencyExponentTags = tlv.filter ( function ( el, index ){
					if ( el.tag === "0x5F36" )
					{
						return true;
					}
					return false;
				} );

				if ( currencyExponentTags.length == 0 )
				{
					this.sendResponse ( _tlv );
					return;
				}

				_tlvAmountTag = amountTags [ 0 ];
				_tlvCurrencyTag = currencyTags [ 0 ];
				_tlvCurrencyExponentTag = currencyExponentTags [ 0 ];

				var tmp = ISO4217.filter ( function ( el, index ){
					if ( parseInt ( el.number, 10 ) === parseInt ( _tlvCurrencyTag.data, 10 ) )
					{
						return true;
					}
					return false;
				} );

				if ( tmp.length == 0 )
				{
					return;
				}

				_currencyInfo = tmp [ 0 ];

				var amount = parseInt ( _tlvAmountTag.data );

				_setAmount ( amount );
				_setDiscountPercent ( _percentDiscount );

				var paymentNodes = $( "#on-start" ).find ( '[data-on-transaction-type="payment"]' );
				var elseNodes = $( "#on-start" ).find ( '[data-on-transaction-type="else"]' );

				// Test is payment
				if ( _isPaymentTransaction )
				{
					$( paymentNodes ).removeClass ( "hidden" );
					$( elseNodes ).addClass ( "hidden" );
				}
				else
				{
					$( paymentNodes ).addClass ( "hidden" );
					$( elseNodes ).removeClass ( "hidden" );
				}

				refreshView();
	
			})
		.on("SE_END", function(tlv,enabled){

				tetra.weblet.show();

				_tlv = tlv;

				console.log ( "END: tlv", tlv );

				_showEndTransactionStatus();

				showView ( "on-end" );

			});

	showView ( "listening" );

	reset();

	//document.getElementById( "discount-slider" ).addEventListener( "change", _onDiscountChange.bind(this) );

	document.getElementById( "on-start-ok-button" ).addEventListener( "mouseup", function(){

		if ( _isPaymentTransaction )
		{
			_processEvalluation("");
		}

		showView ( "listening" );

		serviceStartEnd.sendResponse ( _tlv, function(){

			// Explicit request: hide me
			tetra.weblet.hide();

		} );

	} );

	document.getElementById( "btn-yes" ).addEventListener( "mouseup", function(){
		console.info("teste 1");
		if ( _isPaymentTransaction )
		{
			console.info("teste 2");
			_processEvalluation(1);
		}

		showView ( "listening" );

		serviceStartEnd.sendResponse ( _tlv, function(){

			// Explicit request: hide me
			tetra.weblet.hide();

			console.info("teste 44");

		} );

	} );	

	document.getElementById( "btn-no" ).addEventListener( "mouseup", function(){
		console.info("teste 1");
		if ( _isPaymentTransaction )
		{
			console.info("teste 3");
			_processEvalluation("0");
		}

		showView ( "listening" );

		serviceStartEnd.sendResponse ( _tlv, function(){

			// Explicit request: hide me
			tetra.weblet.hide();

			console.info("teste 4");

		} );

	} );	
	// var smileyButtons = document.getElementsByClassName( "smiley" );

	// for ( var i = 0; i < smileyButtons.length; i++ )
	// {
	// 	smileyButtons [ i ].addEventListener( "mouseup", function(){

	// 		showView ( "listening" );

	// 		serviceStartEnd.sendResponse ( _tlv, function(){

	// 			// Explicit request: hide me
	// 			tetra.weblet.hide();

	// 		} );
	// 	} );
	// }


	
	
