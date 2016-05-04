$(document).ready(function () {
	var alertView = new Backbone.AlertView();
	$("[data-alert-btn]").on('click', function () {
		var type = $(this).data('alert-btn');
		var message = {
			error : 'Error alert message',
			success : 'Success alert message',
			info: 'Info alert message'
		};
		alertView.render(message[type], type);
	});
});