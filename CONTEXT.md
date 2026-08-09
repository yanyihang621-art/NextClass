# NextClass App Domain

NextClass App 面向高校学生管理学期课程。这里定义产品词汇；实现、技术栈和开发边界见 `README.md`。

## Language

**User（用户）**：
能够拥有和管理 NextClass 课表的已认证身份；当前领域模型不另建“学生档案”。
_Avoid_: 学生记录、账号资料（除非明确讨论认证账号）

**Timetable（课表）**：
一个学期课程集合的配置边界，包含名称、开学日期、总周数和节次安排。
_Avoid_: 单门课程、日程

**Active Timetable（活动课表）**：
当前用于课表网格和日程视图的首选课表。
_Avoid_: 当前周、当前课程

**Course（课程）**：
隶属于一个课表、在特定星期和节次区间出现并带有周次规则的教学安排。
_Avoid_: 课表、日程事件

**Period（节次）**：
课表中的一个有序上课时间段，具有编号、开始时间和结束时间。
_Avoid_: 周次、课程时长

**Week Rule（周次规则）**：
说明课程在学期哪些周出现的表达，可包含范围及单双周限制。
_Avoid_: 当前周

**Schedule Import（课表导入）**：
把教务系统课表页面转换为 NextClass 课程并由用户选择覆盖活动课表或创建新课表的流程。
_Avoid_: 自动登录、文件上传（除非对应入口已实现）

**Agenda（日程）**：
从活动课表中按日期、星期和周次筛出的今日课程视图。
_Avoid_: 独立事件、待办事项、日历数据库

**Preferences（个性化偏好）**：
用户对主题色、透明度、圆角和课表单元格高度的显示选择。
_Avoid_: 课表配置、云端用户资料

## Relationships

- 一个 **User** 可以拥有多个 **Timetable**，其中至多一个被显式标记为 **Active Timetable**。
- 一个 **Timetable** 包含多个 **Course**，并定义其 **Period** 列表。
- **Agenda** 只派生自 **Active Timetable** 和其 **Course**，不是独立可写实体。
- **Schedule Import** 的产物是 **Course**，必须归属一个 **Timetable**。
