
from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/<str:username>/', views.profile_view, name='profile'),
    
    # Core API Interactions
    path('api/posts/', views.posts_api, name='posts'),
    path('api/posts/<int:post_id>/like/', views.like_post, name='like_post'),
]