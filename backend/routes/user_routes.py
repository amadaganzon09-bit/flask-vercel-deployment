from flask import Blueprint
from controllers import user_controller
from utils.decorators import token_required

user_bp = Blueprint('user', __name__)

user_bp.route('/user-info', methods=['GET'])(token_required(user_controller.get_user_info))
user_bp.route('/users/<id>', methods=['PUT'])(token_required(user_controller.update_user_info))
user_bp.route('/upload-profile-picture', methods=['POST'])(token_required(user_controller.upload_profile_picture))
user_bp.route('/profile-picture', methods=['GET'])(token_required(user_controller.get_profile_picture))
user_bp.route('/verify-current-password', methods=['POST'])(token_required(user_controller.verify_current_password))
user_bp.route('/change-password', methods=['POST'])(token_required(user_controller.change_password))
