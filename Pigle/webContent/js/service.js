var service = tetra.service({
	service: 'local.webapp.831880FE',
    namespace: 'ingenico.test'
});

service
	.connect()
	.open()
	.on('Test1Event',function(e){
		console.log(e)
	})
	.on('Test2Event',function(e){
		console.log(e)
	});
	
setInterval(function(){
	service
	.reset()
	.call('SendEvents',{
		data:{
			"nEvents": 5, "delay": 1, "message": "Run test reçu", "byte_field": ["01", "02", "03", "FF"]
		}
	});
},2500);
	