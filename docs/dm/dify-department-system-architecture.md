# Dify 部门管理系统 - 系统架构与 API 设计文档

**生成日期**: 2026-07-08
**基于**: Dify Community Edition
**依赖**: dify-database-design-department.md

---

## 目录

1. [系统架构](#系统架构)
2. [后端架构层次](#后端架构层次)
3. [权限中间件设计](#权限中间件设计)
4. [API 接口设计](#api-接口设计)
5. [数据隔离查询逻辑](#数据隔离查询逻辑)
6. [业务规则与约束](#业务规则与约束)

---

## 系统架构

### 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              前端层 (Web)                                    │
│  - 部门管理页面                                                              │
│  - 成员管理页面                                                              │
│  - 应用/知识库列表页面（按部门过滤）                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Controller 层                                     │
│  /console/api/workspaces/current/departments                                │
│  - DepartmentListApi (GET)          - 获取部门列表（树形结构）                │
│  - DepartmentCreateApi (POST)       - 创建部门                               │
│  - DepartmentUpdateApi (PUT)        - 更新部门信息                           │
│  - DepartmentDeleteApi (DELETE)     - 删除部门（需先清空）                    │
│  - DepartmentMembersApi (GET/PUT)   - 管理部门成员                           │
│  - DepartmentAdminsApi (POST/DELETE)- 管理部门管理员                         │
│  - MemberCreateApi (POST)           - 创建成员（管理员手动创建）              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            权限中间件层                                       │
│  - account_initialled_required      - 用户登录检查                           │
│  - tenant_admin_required            - 租户管理员检查                         │
│  - department_permission_required   - 部门权限检查（新增）                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Service 层                                        │
│  DepartmentService                                                          │
│  - list_departments(tenant_id)                                              │
│  - create_department(tenant_id, name, parent_id)                            │
│  - update_department(department_id, name, description)                      │
│  - delete_department(department_id)  # 检查是否有数据/成员                   │
│  - move_member(account_id, target_department_id)                            │
│  - get_department_members(department_id)                                    │
│  - create_member(name, email, password, department_id, role)                │
│  - set_department_admin(department_id, account_id)                          │
│  - unset_department_admin(department_id, account_id)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Repository 层                                     │
│  DepartmentRepository                                                       │
│  - find_by_id(department_id)                                                │
│  - find_by_tenant(tenant_id)                                                │
│  - find_children(parent_id)                                                 │
│  - count_members(department_id)                                             │
│  - count_resources(department_id)  # 应用+知识库数量                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            数据库层                                          │
│  - departments 表                                                           │
│  - tenant_account_joins 表（扩展 department_id、is_department_admin）        │
│  - apps 表（扩展 department_id）                                            │
│  - datasets 表（扩展 department_id）                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 后端架构层次

### Controller 层

**文件位置**: `api/controllers/console/workspace/department.py`

```python
from flask_restful import Resource, reqparse
from flask import request
from libs.login import login_required, account_initialled_required
from controllers.console import api
from controllers.console.wraps import (
    account_initialled_required,
    cloud_edition_billing_resource_check,
)
from services.department_service import DepartmentService
from libs.helper import uuid_value


class DepartmentListApi(Resource):
    """部门列表 API"""
    
    @account_initialled_required
    def get(self):
        """获取部门列表（树形结构）"""
        tenant_id = current_user.current_tenant_id
        departments = DepartmentService.list_departments(tenant_id)
        return {
            'departments': [dept.to_dict() for dept in departments],
            'tree': DepartmentService.build_department_tree(departments)
        }
    
    @account_initialled_required
    def post(self):
        """创建部门"""
        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str, required=True, location='json')
        parser.add_argument('parent_id', type=uuid_value, required=False, location='json')
        parser.add_argument('description', type=str, required=False, location='json')
        args = parser.parse_args()
        
        # 只有租户管理员可以创建部门
        if not current_user.is_admin_or_owner:
            raise ForbiddenError("Only tenant admin can create department")
        
        tenant_id = current_user.current_tenant_id
        department = DepartmentService.create_department(
            tenant_id=tenant_id,
            name=args['name'],
            parent_id=args.get('parent_id'),
            description=args.get('description'),
            created_by=current_user.id
        )
        return department.to_dict(), 201


class DepartmentApi(Resource):
    """单个部门 API"""
    
    @account_initialled_required
    def put(self, department_id):
        """更新部门信息"""
        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str, required=False, location='json')
        parser.add_argument('description', type=str, required=False, location='json')
        args = parser.parse_args()
        
        # 只有租户管理员可以更新部门
        if not current_user.is_admin_or_owner:
            raise ForbiddenError("Only tenant admin can update department")
        
        department = DepartmentService.update_department(
            department_id=department_id,
            name=args.get('name'),
            description=args.get('description'),
            updated_by=current_user.id
        )
        return department.to_dict()
    
    @account_initialled_required
    def delete(self, department_id):
        """删除部门（需先清空）"""
        # 只有租户管理员可以删除部门
        if not current_user.is_admin_or_owner:
            raise ForbiddenError("Only tenant admin can delete department")
        
        DepartmentService.delete_department(department_id)
        return {'result': 'success'}, 200


class DepartmentMemberApi(Resource):
    """部门成员 API"""
    
    @account_initialled_required
    def get(self, department_id):
        """获取部门成员列表"""
        # 检查权限：租户管理员或部门管理员（可以看到本部门及子部门成员）
        if not current_user.is_admin_or_owner:
            if not DepartmentService.is_department_member(department_id, current_user.id):
                raise ForbiddenError("No permission to view department members")
        
        members = DepartmentService.get_department_members(department_id)
        
        # 判断当前用户是否可以设置部门管理员（只有租户管理员可以）
        can_set_admin = current_user.is_admin_or_owner
        
        return {
            'members': [member.to_dict() for member in members],
            'can_set_admin': can_set_admin  # 前端根据此字段决定是否显示"设为管理员"按钮
        }
    
    @account_initialled_required
    def put(self, department_id):
        """调整成员部门"""
        parser = reqparse.RequestParser()
        parser.add_argument('account_id', type=uuid_value, required=True, location='json')
        parser.add_argument('target_department_id', type=uuid_value, required=True, location='json')
        args = parser.parse_args()
        
        # 检查权限：租户管理员或部门管理员
        if not current_user.is_admin_or_owner:
            if not DepartmentService.is_department_admin(current_user.id, department_id):
                raise ForbiddenError("No permission to move members")
        
        DepartmentService.move_member(
            account_id=args['account_id'],
            target_department_id=args['target_department_id'],
            operator_id=current_user.id
        )
        return {'result': 'success'}


class DepartmentAdminApi(Resource):
    """部门管理员 API"""
    
    @account_initialled_required
    def post(self, department_id):
        """设置部门管理员"""
        parser = reqparse.RequestParser()
        parser.add_argument('account_id', type=uuid_value, required=True, location='json')
        args = parser.parse_args()
        
        # 只有租户管理员可以设置部门管理员
        if not current_user.is_admin_or_owner:
            raise ForbiddenError("Only tenant admin can set department admin")
        
        DepartmentService.set_department_admin(
            department_id=department_id,
            account_id=args['account_id']
        )
        return {'result': 'success'}
    
    @account_initialled_required
    def delete(self, department_id):
        """取消部门管理员"""
        parser = reqparse.RequestParser()
        parser.add_argument('account_id', type=uuid_value, required=True, location='json')
        args = parser.parse_args()
        
        # 只有租户管理员可以取消部门管理员
        if not current_user.is_admin_or_owner:
            raise ForbiddenError("Only tenant admin can unset department admin")
        
        DepartmentService.unset_department_admin(
            department_id=department_id,
            account_id=args['account_id']
        )
        return {'result': 'success'}


# 注册路由
api.add_resource(DepartmentListApi, '/workspaces/current/departments')
api.add_resource(DepartmentApi, '/departments/<uuid:department_id>')
api.add_resource(DepartmentMemberApi, '/departments/<uuid:department_id>/members')
api.add_resource(DepartmentAdminApi, '/departments/<uuid:department_id>/admins')
```

---

## 权限中间件设计

### 新增中间件

**文件位置**: `api/controllers/console/wraps.py`

```python
from functools import wraps
from flask_login import current_user
from services.department_service import DepartmentService


def department_permission_required(permission: str):
    """
    部门权限检查中间件
    
    permission 可选值:
    - 'view': 查看部门数据
    - 'manage': 管理部门结构（仅租户管理员）
    - 'manage_members': 管理部门成员（部门管理员）
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 租户管理员跳过部门检查
            if current_user.is_admin_or_owner:
                return func(*args, **kwargs)
            
            # 获取部门 ID
            department_id = kwargs.get('department_id')
            if not department_id:
                raise ValueError("department_id is required")
            
            # 检查权限
            if permission == 'view':
                if not DepartmentService.is_department_member(department_id, current_user.id):
                    raise ForbiddenError("No permission to view this department")
            
            elif permission == 'manage_members':
                if not DepartmentService.is_department_admin(current_user.id, department_id):
                    raise ForbiddenError("No permission to manage department members")
            
            elif permission == 'manage':
                if not current_user.is_admin_or_owner:
                    raise ForbiddenError("No permission to manage department")
            
            return func(*args, **kwargs)
        return wrapper
    return decorator
```

---

## API 接口设计

### 接口列表

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/console/api/workspaces/current/departments` | 所有成员 | 获取部门列表（树形结构） |
| POST | `/console/api/workspaces/current/departments` | 租户管理员 | 创建部门 |
| PUT | `/console/api/departments/<id>` | 租户管理员 | 更新部门信息 |
| DELETE | `/console/api/departments/<id>` | 租户管理员 | 删除部门（需先清空） |
| GET | `/console/api/departments/<id>/members` | 部门成员 | 获取部门成员列表 |
| PUT | `/console/api/departments/<id>/members` | 部门管理员 | 调整成员部门 |
| POST | `/console/api/departments/<id>/admins` | 租户管理员 | 设置部门管理员 |
| DELETE | `/console/api/departments/<id>/admins` | 租户管理员 | 取消部门管理员 |
| POST | `/console/api/workspaces/current/members` | 租户管理员/部门管理员 | 创建成员（管理员手动创建） |

### 请求/响应示例

#### 获取部门列表

**请求**:
```
GET /console/api/workspaces/current/departments
```

**响应**:
```json
{
  "departments": [
    {
      "id": "abc123",
      "name": "技术部",
      "parent_id": null,
      "level": 1,
      "member_count": 10,
      "app_count": 5,
      "dataset_count": 3
    }
  ],
  "tree": [
    {
      "id": "abc123",
      "name": "技术部",
      "children": [
        {
          "id": "def456",
          "name": "前端组",
          "children": []
        }
      ]
    }
  ]
}
```

#### 创建部门

**请求**:
```json
POST /console/api/workspaces/current/departments
{
  "name": "产品部",
  "parent_id": "abc123",
  "description": "负责产品设计"
}
```

**响应**:
```json
{
  "id": "ghi789",
  "name": "产品部",
  "parent_id": "abc123",
  "level": 2,
  "path": "/abc123/ghi789",
  "created_at": "2026-07-08T10:00:00Z"
}
```

#### 删除部门

**请求**:
```
DELETE /console/api/departments/abc123
```

**响应（成功）**:
```json
{
  "result": "success"
}
```

**响应（失败 - 有成员）**:
```json
{
  "code": "validation_error",
  "message": "部门下有 5 个成员，请先转移成员",
  "status": 400
}
```

#### 创建成员

**请求**:
```json
POST /console/api/workspaces/current/members
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "password": "InitialPass123!",
  "department_id": "abc123",
  "role": "editor",
  "is_department_admin": false
}
```

**响应（成功）**:
```json
{
  "id": "user123",
  "name": "张三",
  "email": "zhangsan@example.com",
  "department_id": "abc123",
  "role": "editor",
  "is_department_admin": false,
  "created_at": "2026-07-08T10:00:00Z"
}
```

**响应（失败 - 邮箱已存在）**:
```json
{
  "code": "validation_error",
  "message": "邮箱已被使用",
  "status": 400
}
```

---

## 数据隔离查询逻辑

### 应用查询

**文件位置**: `api/services/app_service.py`

```python
def get_accessible_apps(user: Account, tenant_id: str, **kwargs):
    """获取用户可访问的应用列表"""
    
    # 租户管理员：返回所有应用
    if user.is_admin_or_owner:
        query = App.query.filter_by(tenant_id=tenant_id)
    else:
        user_department_id = DepartmentService.get_user_department_id(user.id, tenant_id)
        
        # 部门管理员：返回本部门及子部门应用
        if DepartmentService.is_department_admin(user.id, user_department_id):
            user_department = DepartmentRepository.find_by_id(user_department_id)
            # 查询本部门及所有子部门的 ID
            department_ids = [d.id for d in DepartmentRepository.find_by_path_prefix(user_department.path)]
            query = App.query.filter(
                App.tenant_id == tenant_id,
                App.department_id.in_(department_ids)
            )
        else:
            # 普通成员：返回本部门应用
            query = App.query.filter_by(
                tenant_id=tenant_id,
                department_id=user_department_id
            )
    
    # 应用其他过滤条件
    if kwargs.get('mode'):
        query = query.filter_by(mode=kwargs['mode'])
    
    return query.order_by(App.created_at.desc()).all()


def create_app(user: Account, tenant_id: str, **kwargs):
    """创建应用"""
    
    # 获取部门 ID
    if user.is_admin_or_owner:
        # 租户管理员：必须手动选择部门
        department_id = kwargs.get('department_id')
        if not department_id:
            raise ValidationError("department_id is required for tenant admin")
    else:
        user_department_id = DepartmentService.get_user_department_id(user.id, tenant_id)
        
        # 部门管理员：可以选择本部门及子部门
        if DepartmentService.is_department_admin(user.id, user_department_id):
            department_id = kwargs.get('department_id')
            if not department_id:
                raise ValidationError("department_id is required for department admin")
            # 验证部门是否在本部门及子部门范围内
            user_department = DepartmentRepository.find_by_id(user_department_id)
            allowed_department_ids = [d.id for d in DepartmentRepository.find_by_path_prefix(user_department.path)]
            if department_id not in allowed_department_ids:
                raise ValidationError("department_id must be within your department or sub-departments")
        else:
            # 普通成员：自动使用所属部门
            department_id = user_department_id
    
    # 创建应用
    app = App(
        tenant_id=tenant_id,
        department_id=department_id,
        created_by=user.id,
        **kwargs
    )
    db.session.add(app)
    db.session.commit()
    return app


def update_app(user: Account, app_id: str, **kwargs):
    """更新应用（包括转移部门）"""
    
    app = App.query.get(app_id)
    if not app:
        raise NotFoundError("App not found")
    
    # 检查部门变更
    if 'department_id' in kwargs:
        new_department_id = kwargs['department_id']
        
        # 租户管理员：可以转移到任何部门
        if user.is_admin_or_owner:
            pass
        else:
            user_department_id = DepartmentService.get_user_department_id(user.id, app.tenant_id)
            
            # 部门管理员：可以转移到本部门及子部门
            if DepartmentService.is_department_admin(user.id, user_department_id):
                user_department = DepartmentRepository.find_by_id(user_department_id)
                allowed_department_ids = [d.id for d in DepartmentRepository.find_by_path_prefix(user_department.path)]
                if new_department_id not in allowed_department_ids:
                    raise ValidationError("department_id must be within your department or sub-departments")
            else:
                # 普通成员：不能转移应用
                raise ForbiddenError("Only admin can transfer app")
    
    # 更新应用
    for key, value in kwargs.items():
        setattr(app, key, value)
    
    db.session.commit()
    return app
```

### 知识库查询

**文件位置**: `api/services/dataset_service.py`

```python
def get_accessible_datasets(user: Account, tenant_id: str, **kwargs):
    """获取用户可访问的知识库列表"""
    
    # 租户管理员：返回所有知识库
    if user.is_admin_or_owner:
        query = Dataset.query.filter_by(tenant_id=tenant_id)
    else:
        user_department_id = DepartmentService.get_user_department_id(user.id, tenant_id)
        
        # 部门管理员：返回本部门及子部门知识库
        if DepartmentService.is_department_admin(user.id, user_department_id):
            user_department = DepartmentRepository.find_by_id(user_department_id)
            # 查询本部门及所有子部门的 ID
            department_ids = [d.id for d in DepartmentRepository.find_by_path_prefix(user_department.path)]
            query = Dataset.query.filter(
                Dataset.tenant_id == tenant_id,
                Dataset.department_id.in_(department_ids)
            )
        else:
            # 普通成员：返回本部门知识库
            query = Dataset.query.filter_by(
                tenant_id=tenant_id,
                department_id=user_department_id
            )
    
    # 应用其他过滤条件
    if kwargs.get('permission'):
        query = query.filter_by(permission=kwargs['permission'])
    
    return query.order_by(Dataset.created_at.desc()).all()


def create_dataset(user: Account, tenant_id: str, **kwargs):
    """创建知识库"""
    
    # 获取部门 ID
    if user.is_admin_or_owner:
        # 租户管理员：必须手动选择部门
        department_id = kwargs.get('department_id')
        if not department_id:
            raise ValidationError("department_id is required for tenant admin")
    else:
        user_department_id = DepartmentService.get_user_department_id(user.id, tenant_id)
        
        # 部门管理员：可以选择本部门及子部门
        if DepartmentService.is_department_admin(user.id, user_department_id):
            department_id = kwargs.get('department_id')
            if not department_id:
                raise ValidationError("department_id is required for department admin")
            # 验证部门是否在本部门及子部门范围内
            user_department = DepartmentRepository.find_by_id(user_department_id)
            allowed_department_ids = [d.id for d in DepartmentRepository.find_by_path_prefix(user_department.path)]
            if department_id not in allowed_department_ids:
                raise ValidationError("department_id must be within your department or sub-departments")
        else:
            # 普通成员：自动使用所属部门
            department_id = user_department_id
    
    # 创建知识库
    dataset = Dataset(
        tenant_id=tenant_id,
        department_id=department_id,
        created_by=user.id,
        **kwargs
    )
    db.session.add(dataset)
    db.session.commit()
    return dataset


def update_dataset(user: Account, dataset_id: str, **kwargs):
    """更新知识库（包括转移部门）"""
    
    dataset = Dataset.query.get(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset not found")
    
    # 检查部门变更
    if 'department_id' in kwargs:
        new_department_id = kwargs['department_id']
        
        # 租户管理员：可以转移到任何部门
        if user.is_admin_or_owner:
            pass
        else:
            user_department_id = DepartmentService.get_user_department_id(user.id, dataset.tenant_id)
            
            # 部门管理员：可以转移到本部门及子部门
            if DepartmentService.is_department_admin(user.id, user_department_id):
                user_department = DepartmentRepository.find_by_id(user_department_id)
                allowed_department_ids = [d.id for d in DepartmentRepository.find_by_path_prefix(user_department.path)]
                if new_department_id not in allowed_department_ids:
                    raise ValidationError("department_id must be within your department or sub-departments")
            else:
                # 普通成员：不能转移知识库
                raise ForbiddenError("Only admin can transfer dataset")
    
    # 更新知识库
    for key, value in kwargs.items():
        setattr(dataset, key, value)
    
    db.session.commit()
    return dataset


def get_department_filter_tabs(user: Account, tenant_id: str):
    """获取部门筛选标签列表
    
    根据用户角色返回不同范围的部门列表：
    - 租户管理员：所有部门
    - 部门管理员：本部门及子部门
    - 普通成员：仅本部门
    """
    
    if user.is_admin_or_owner:
        # 租户管理员：返回所有部门
        return DepartmentRepository.find_by_tenant(tenant_id)
    
    user_department_id = DepartmentService.get_user_department_id(user.id, tenant_id)
    
    if DepartmentService.is_department_admin(user.id, user_department_id):
        # 部门管理员：返回本部门及所有子部门
        user_department = DepartmentRepository.find_by_id(user_department_id)
        return DepartmentRepository.find_by_path_prefix(user_department.path)
    else:
        # 普通成员：仅返回本部门
        return [DepartmentRepository.find_by_id(user_department_id)]
```

---

## 并发控制与事务管理

### 部门删除操作的原子性

部门删除操作必须在单个数据库事务中完成以下检查和操作：

```python
def delete_department(department_id: str):
    """删除部门"""
    with db.session.begin():
        # 1. 检查是否有子部门
        children_count = DepartmentRepository.count_children(department_id)
        if children_count > 0:
            raise ValidationError(f"部门下有 {children_count} 个子部门，请先删除子部门")
        
        # 2. 检查是否有成员
        members_count = DepartmentRepository.count_members(department_id)
        if members_count > 0:
            raise ValidationError(f"部门下有 {members_count} 个成员，请先转移成员")
        
        # 3. 检查是否有应用
        apps_count = DepartmentRepository.count_apps(department_id)
        if apps_count > 0:
            raise ValidationError(f"部门下有 {apps_count} 个应用，请先转移应用")
        
        # 4. 检查是否有知识库
        datasets_count = DepartmentRepository.count_datasets(department_id)
        if datasets_count > 0:
            raise ValidationError(f"部门下有 {datasets_count} 个知识库，请先转移知识库")
        
        # 5. 执行删除（使用乐观锁防止并发删除）
        department = DepartmentRepository.find_by_id(department_id)
        if not department:
            raise NotFoundError("Department not found")
        
        # 检查更新时间，防止并发修改
        if department.updated_at != kwargs.get('expected_updated_at'):
            raise ConflictError("部门已被其他用户修改，请刷新后重试")
        
        db.session.delete(department)
        
        # 6. 记录审计日志
        OperationLogService.log(
            action='delete_department',
            target_id=department_id,
            target_type='department',
            operator_id=current_user.id,
            details={'department_name': department.name}
        )
```

### 成员移动操作的并发控制

成员移动操作使用悲观锁防止并发修改：

```python
def move_member(account_id: str, target_department_id: str, operator_id: str):
    """移动成员部门"""
    with db.session.begin():
        # 1. 锁定成员记录（悲观锁）
        join = db.session.query(TenantAccountJoin).filter(
            TenantAccountJoin.account_id == account_id
        ).with_for_update().first()
        
        if not join:
            raise NotFoundError("Member not found")
        
        # 2. 检查操作者权限
        operator_join = db.session.query(TenantAccountJoin).filter(
            TenantAccountJoin.account_id == operator_id,
            TenantAccountJoin.tenant_id == join.tenant_id
        ).first()
        
        if not operator_join:
            raise ForbiddenError("Operator not in tenant")
        
        # 租户管理员可以移动任何成员
        if not operator_join.is_admin_or_owner:
            # 部门管理员只能移动本部门及子部门的成员
            if not DepartmentService.is_department_admin(operator_id, join.department_id):
                raise ForbiddenError("No permission to move this member")
            
            # 不能移出自己
            if account_id == operator_id:
                raise ValidationError("Cannot move yourself")
        
        # 3. 更新成员部门
        old_department_id = join.department_id
        join.department_id = target_department_id
        
        # 4. 如果成员是部门管理员，取消原部门的管理员权限
        if join.is_department_admin:
            join.is_department_admin = False
            
            # 5. 通知租户管理员
            TenantNotificationService.notify_tenant_admins(
                tenant_id=join.tenant_id,
                notification_type='department_admin_changed',
                message=f"成员 {join.account.name} 因部门变更，已取消原部门管理员权限"
            )
        
        # 6. 记录审计日志
        OperationLogService.log(
            action='move_member',
            target_id=account_id,
            target_type='account',
            operator_id=operator_id,
            details={
                'old_department_id': old_department_id,
                'new_department_id': target_department_id
            }
        )
```

### 部门移动的级联更新

移动部门时需要更新该部门及所有子部门的 `path` 字段：

```python
def move_department(department_id: str, new_parent_id: str):
    """移动部门"""
    with db.session.begin():
        # 1. 获取部门信息
        department = DepartmentRepository.find_by_id(department_id)
        if not department:
            raise NotFoundError("Department not found")
        
        # 2. 检查新父部门是否存在
        new_parent = DepartmentRepository.find_by_id(new_parent_id)
        if not new_parent:
            raise NotFoundError("Parent department not found")
        
        # 3. 检查层级深度
        if new_parent.level + 1 > 10:
            raise ValidationError("部门层级不能超过 10 级")
        
        # 4. 计算新的 path
        old_path = department.path
        new_path = f"{new_parent.path}/{department_id}"
        
        # 5. 更新该部门及所有子部门的 path
        # 使用 SQL 的 REPLACE 函数批量更新
        db.session.execute(
            """
            UPDATE departments
            SET path = REPLACE(path, :old_path, :new_path),
                level = level + :level_diff,
                updated_at = NOW()
            WHERE path LIKE :old_path_pattern
            """,
            {
                'old_path': old_path,
                'new_path': new_path,
                'level_diff': new_parent.level - department.level + 1,
                'old_path_pattern': f"{old_path}%"
            }
        )
        
        # 6. 记录审计日志
        OperationLogService.log(
            action='move_department',
            target_id=department_id,
            target_type='department',
            operator_id=current_user.id,
            details={
                'old_parent_id': department.parent_id,
                'new_parent_id': new_parent_id,
                'old_path': old_path,
                'new_path': new_path
            }
        )
```

---

## 审计日志

### 需要记录审计日志的操作

以下敏感操作必须记录审计日志：

| 操作 | 日志类型 | 记录内容 |
|------|---------|---------|
| 创建部门 | `create_department` | 部门 ID、部门名称、父部门 ID |
| 删除部门 | `delete_department` | 部门 ID、部门名称 |
| 移动部门 | `move_department` | 部门 ID、原父部门 ID、新父部门 ID |
| 创建成员 | `create_member` | 成员 ID、姓名、邮箱、部门 ID、角色 |
| 移动成员 | `move_member` | 成员 ID、原部门 ID、新部门 ID |
| 设置部门管理员 | `set_department_admin` | 成员 ID、部门 ID |
| 取消部门管理员 | `unset_department_admin` | 成员 ID、部门 ID |
| 转移应用 | `transfer_app` | 应用 ID、原部门 ID、新部门 ID |
| 转移知识库 | `transfer_dataset` | 知识库 ID、原部门 ID、新部门 ID |

### 审计日志查询

```python
# 查询部门操作历史
def get_department_operation_logs(department_id: str, limit: int = 100):
    """查询部门操作历史"""
    return db.session.query(OperationLog).filter(
        or_(
            OperationLog.target_id == department_id,
            OperationLog.details['department_id'].astext == department_id
        )
    ).order_by(OperationLog.created_at.desc()).limit(limit).all()

# 查询成员操作历史
def get_member_operation_logs(account_id: str, limit: int = 100):
    """查询成员操作历史"""
    return db.session.query(OperationLog).filter(
        or_(
            OperationLog.target_id == account_id,
            OperationLog.details['account_id'].astext == account_id
        )
    ).order_by(OperationLog.created_at.desc()).limit(limit).all()
```

---

## 数据迁移与向后兼容

### 现有数据迁移

在引入部门管理功能时，需要对现有数据进行迁移：

```sql
-- 1. 为每个租户创建默认部门
INSERT INTO departments (id, tenant_id, parent_id, name, path, level, is_default, created_by, created_at, updated_at)
SELECT
  uuid_generate_v4(),
  t.id,
  NULL,
  '默认部门',
  '/' || t.id || '/' || uuid_generate_v4(),
  1,
  true,
  (SELECT account_id FROM tenant_account_joins WHERE tenant_id = t.id LIMIT 1),
  NOW(),
  NOW()
FROM tenants t;

-- 2. 将现有用户分配到默认部门
UPDATE tenant_account_joins taj
SET department_id = (
  SELECT d.id FROM departments d
  WHERE d.tenant_id = taj.tenant_id AND d.is_default = true
)
WHERE taj.department_id IS NULL;

-- 3. 将现有应用分配到默认部门
UPDATE apps a
SET department_id = (
  SELECT d.id FROM departments d
  WHERE d.tenant_id = a.tenant_id AND d.is_default = true
)
WHERE a.department_id IS NULL;

-- 4. 将现有知识库分配到默认部门
UPDATE datasets ds
SET department_id = (
  SELECT d.id FROM departments d
  WHERE d.tenant_id = ds.tenant_id AND d.is_default = true
)
WHERE ds.department_id IS NULL;
```

### API 向后兼容

为了保持向后兼容，现有的 API 接口需要做以下处理：

#### 创建应用 API

```python
def create_app(user: Account, tenant_id: str, **kwargs):
    """创建应用"""
    
    # 获取部门 ID
    if user.is_admin_or_owner:
        # 租户管理员：必须手动选择部门
        department_id = kwargs.get('department_id')
        if not department_id:
            # 向后兼容：如果未指定部门，使用默认部门
            department_id = DepartmentService.get_default_department_id(tenant_id)
    else:
        user_department_id = DepartmentService.get_user_department_id(user.id, tenant_id)
        
        # 部门管理员：可以选择本部门及子部门
        if DepartmentService.is_department_admin(user.id, user_department_id):
            department_id = kwargs.get('department_id')
            if not department_id:
                # 向后兼容：如果未指定部门，使用用户所属部门
                department_id = user_department_id
            # 验证部门是否在本部门及子部门范围内
            user_department = DepartmentRepository.find_by_id(user_department_id)
            allowed_department_ids = [d.id for d in DepartmentRepository.find_by_path_prefix(user_department.path)]
            if department_id not in allowed_department_ids:
                raise ValidationError("department_id must be within your department or sub-departments")
        else:
            # 普通成员：自动使用所属部门
            department_id = user_department_id
    
    # 创建应用
    app = App(
        tenant_id=tenant_id,
        department_id=department_id,
        created_by=user.id,
        **kwargs
    )
    db.session.add(app)
    db.session.commit()
    return app
```

#### 创建知识库 API

```python
def create_dataset(user: Account, tenant_id: str, **kwargs):
    """创建知识库"""
    
    # 获取部门 ID
    if user.is_admin_or_owner:
        # 租户管理员：必须手动选择部门
        department_id = kwargs.get('department_id')
        if not department_id:
            # 向后兼容：如果未指定部门，使用默认部门
            department_id = DepartmentService.get_default_department_id(tenant_id)
    else:
        user_department_id = DepartmentService.get_user_department_id(user.id, tenant_id)
        
        # 部门管理员：可以选择本部门及子部门
        if DepartmentService.is_department_admin(user.id, user_department_id):
            department_id = kwargs.get('department_id')
            if not department_id:
                # 向后兼容：如果未指定部门，使用用户所属部门
                department_id = user_department_id
            # 验证部门是否在本部门及子部门范围内
            user_department = DepartmentRepository.find_by_id(user_department_id)
            allowed_department_ids = [d.id for d in DepartmentRepository.find_by_path_prefix(user_department.path)]
            if department_id not in allowed_department_ids:
                raise ValidationError("department_id must be within your department or sub-departments")
        else:
            # 普通成员：自动使用所属部门
            department_id = user_department_id
    
    # 创建知识库
    dataset = Dataset(
        tenant_id=tenant_id,
        department_id=department_id,
        created_by=user.id,
        **kwargs
    )
    db.session.add(dataset)
    db.session.commit()
    return dataset
```

### 前端迁移指南

前端需要在以下对话框中添加"所属部门"字段：

1. **创建应用对话框**
   - 租户管理员：显示部门选择器，必须选择部门
   - 部门管理员：显示部门选择器，可以选择本部门及子部门
   - 普通成员：隐藏部门选择器，自动使用所属部门

2. **创建知识库对话框**
   - 租户管理员：显示部门选择器，必须选择部门
   - 部门管理员：显示部门选择器，可以选择本部门及子部门
   - 普通成员：隐藏部门选择器，自动使用所属部门

3. **编辑应用对话框**
   - 添加"所属部门"字段，允许转移应用
   - 权限控制：租户管理员可以转移到任何部门，部门管理员只能转移到本部门及子部门

4. **编辑知识库对话框**
   - 添加"所属部门"字段，允许转移知识库
   - 权限控制：租户管理员可以转移到任何部门，部门管理员只能转移到本部门及子部门

---

## 业务规则与约束

### 部门创建规则

1. 部门名称在同一父部门下必须唯一
2. **对于根部门（parent_id = NULL），同一租户下所有根部门的名称必须唯一**
3. 部门层级深度限制：最多 10 级
4. 只有租户管理员可以创建部门
5. 创建部门时自动创建默认部门（如果租户还没有默认部门）

### 部门删除规则

1. 部门下有成员时禁止删除
2. 部门下有应用或知识库时禁止删除
3. 部门下有子部门时禁止删除
4. 默认部门禁止删除

### 默认部门规则

1. 每个租户有且仅有一个默认部门（`is_default = true`）
2. 默认部门**不可删除**
3. 默认部门**可以重命名**
4. 新租户创建时自动创建默认部门
5. 数据迁移时，现有数据自动归属到默认部门
6. 默认部门的 `path` 格式为 `/租户ID/部门ID`
7. **默认部门不能有子部门**（前端创建部门时，父部门选择器中过滤掉默认部门）

### 成员创建规则

1. 成员由管理员手动创建（不再使用邀请制）
2. 创建成员时必须指定所属部门
3. **邮箱必须全局唯一**（一个账户只能属于一个租户，不能跨租户）
4. 管理员必须设置初始密码
5. 创建成功后系统自动发送通知邮件（包含初始密码）
6. 租户管理员可以创建任何部门的成员
7. 部门管理员可以创建本部门及子部门的成员
8. **部门管理员创建成员时，可以选择本部门及子部门**
9. **部门管理员创建成员时，只能选择 `editor`、`normal`、`dataset_operator` 角色**（不能创建 `owner` 或 `admin` 角色）
10. **初始密码无特殊安全要求**，由管理员自行设置（建议至少 8 位，包含字母和数字）
11. **创建成员时，系统应检查邮箱是否已被其他租户使用**（全局唯一性检查）

### 成员移动规则

1. 成员移动部门时，其创建的应用/知识库留在原部门
2. 成员移动后，对原部门的数据**不再可见**（不实现只读权限）
3. 只有租户管理员或部门管理员可以移动成员
4. **部门管理员可以移动本部门及子部门的成员**
5. **部门管理员不能移出自己**
6. **部门管理员移动成员时，目标部门可以是本部门及子部门**
7. **如果移动的成员是部门管理员，系统自动取消其原部门的管理员权限，并通知租户管理员**
8. **移动成员前的数据处理**：
   - 系统应显示该成员创建的应用/知识库列表
   - 提供"转移数据"选项，允许在移动成员前转移其创建的数据
   - 添加确认对话框，提醒用户"该成员创建的应用/知识库将留在原部门，成员对原部门数据将不再可见"

### 部门管理员规则

1. 一个部门可以有多个部门管理员
2. 部门管理员必须是该部门的成员
3. **只有租户管理员可以设置/取消部门管理员**（部门管理员无此权限）
4. 部门管理员可以管理部门成员，但不能管理部门结构
5. **只有 owner/admin/editor 角色可以被设置为部门管理员**（normal 和 dataset_operator 不可以）
6. **部门管理员可以看到和管理本部门及子部门的数据和成员**
7. **部门管理员不能移出自己**
8. **部门可以没有部门管理员**（所有成员由租户管理员管理）
9. **部门管理员创建成员时，可以选择本部门及子部门**
10. **部门管理员移动成员时，目标部门可以是本部门及子部门**
11. **部门管理员转移数据时，目标部门可以是本部门及子部门**
12. **部门管理员可以编辑本部门及子部门成员的角色**（但不能编辑租户角色）
13. **部门管理员可以移出本部门及子部门成员**
14. **如果父部门和子部门都有部门管理员，各自管理各自的范围，不冲突**：
    - 父部门管理员可以管理所有子部门的成员和数据
    - 子部门管理员只能管理本部门的成员和数据
    - 两者的权限范围有重叠，但不会产生冲突

### 角色变更规则

1. **如果部门管理员的角色从 owner/admin/editor 变为 normal 或 dataset_operator，系统自动取消其部门管理员权限，并通知租户管理员**
2. 角色变更时，系统检查该用户是否是部门管理员
3. 如果是，自动设置 `is_department_admin = false`
4. 发送通知邮件给租户管理员，说明该用户因角色变更而失去部门管理员权限

### 部门变更规则

1. **如果部门管理员被移动到其他部门，系统自动取消其原部门的管理员权限，并通知租户管理员**
2. 成员移动时，系统检查该成员是否是部门管理员
3. 如果是，自动设置 `is_department_admin = false`
4. 发送通知邮件给租户管理员，说明该用户因部门变更而失去原部门的管理员权限

---

## 总结

本文档详细描述了 Dify 部门管理系统的系统架构与 API 设计，包括：

1. **系统架构**：前端层、Controller 层、权限中间件层、Service 层、Repository 层、数据库层
2. **后端架构层次**：Controller、Service、Repository 的职责划分
3. **权限中间件设计**：部门权限检查中间件
4. **API 接口设计**：部门管理、成员管理、部门管理员管理的 API 接口
5. **数据隔离查询逻辑**：应用、知识库的部门隔离查询
6. **并发控制与事务管理**：部门删除、成员移动、部门移动的原子性和锁机制
7. **审计日志**：敏感操作的审计日志记录
8. **数据迁移与向后兼容**：现有数据迁移、API 向后兼容、前端迁移指南
9. **业务规则与约束**：部门创建、删除、默认部门、成员创建、移动、部门管理员、角色变更、部门变更等规则

**核心设计决策**：
- 部门在租户内部，保持向后兼容
- 用户与部门是单部门关系
- 部门管理员权限 = 租户角色权限 + 部门管理范围
- 默认部门用于兼容现有数据，不能有子部门
- 邮箱全局唯一，一个账户只能属于一个租户
- 部门管理员创建成员时只能选择 editor/normal/dataset_operator 角色
- 成员移动后，其创建的数据留在原部门
- 如果父部门和子部门都有部门管理员，各自管理各自的范围

---

**文档结束**
