import json
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .models import Post, Comment

# ==========================================
#        PAGE RENDERING VIEWS (HTML)
# ==========================================

def home(request):
    # Renders the main dashboard shell
    return render(request, 'index.html')

def login_view(request):
    if request.method == 'POST':
        data = request.POST  # Handles standard HTML form submissions
        username = data.get('username')
        password = data.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('/')
        return render(request, 'login.html', {'error': 'Invalid credentials'})
    return render(request, 'login.html')

def register_view(request):
    if request.method == 'POST':
        data = request.POST
        username = data.get('username')
        password = data.get('password')
        if User.objects.filter(username=username).exists():
            return render(request, 'register.html', {'error': 'Username already taken'})
        user = User.objects.create_user(username=username, password=password)
        login(request, user)
        return redirect('/')
    return render(request, 'register.html')

def logout_view(request):
    logout(request)
    return redirect('/login/')

def profile_view(request, username):
    try:
        profile_user = User.objects.get(username=username)
        post_count = Post.objects.filter(user=profile_user).count()
        context = {
            'profile_user': profile_user,
            'post_count': post_count
        }
        return render(request, 'profile.html', context)
    except User.DoesNotExist:
        return redirect('/')

# ==========================================
#          CORE API ENDPOINTS (JSON)
# ==========================================

def posts_api(request):
    if request.method == 'GET':
        posts = Post.objects.all().order_by('-created_at')
        posts_data = [{
            'id': post.id,
            'username': post.user.username,
            'content': post.content,
            'created_at': post.created_at.strftime("%b %d, %H:%M"),
            'likes_count': post.likes.count(),
            'has_liked': request.user in post.likes.all() if request.user.is_authenticated else False
        } for post in posts]
        return JsonResponse({'posts': posts_data})

    elif request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        data = json.loads(request.body)
        post = Post.objects.create(user=request.user, content=data.get('content'))
        return JsonResponse({'message': 'Post created!', 'id': post.id})

@csrf_exempt
def like_post(request, post_id):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Please log in to like posts.'}, status=401)
        
        try:
            post = Post.objects.get(id=post_id)
            if request.user in post.likes.all():
                post.likes.remove(request.user)
                liked = False
            else:
                post.likes.add(request.user)
                liked = True
            return JsonResponse({'liked': liked, 'likes_count': post.likes.count()})
        except Post.DoesNotExist:
            return JsonResponse({'error': 'Post not found'}, status=404)