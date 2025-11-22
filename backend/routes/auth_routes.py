from flask import Blueprint
from controllers import auth_controller
from utils.decorators import token_required

auth_bp = Blueprint('auth', __name__)

auth_bp.route('/request-otp', methods=['POST'])(auth_controller.request_otp)
auth_bp.route('/forgot-password/request-otp', methods=['POST'])(auth_controller.request_password_reset_otp)
auth_bp.route('/verify-otp-and-register', methods=['POST'])(auth_controller.verify_otp_and_register)
auth_bp.route('/forgot-password/verify-otp', methods=['POST'])(auth_controller.verify_password_reset_otp)
auth_bp.route('/forgot-password/reset', methods=['POST'])(auth_controller.reset_password)
auth_bp.route('/login', methods=['POST'])(auth_controller.login)
auth_bp.route('/logout', methods=['POST'])(token_required(auth_controller.logout))
