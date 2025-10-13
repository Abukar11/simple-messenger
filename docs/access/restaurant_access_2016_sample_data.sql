INSERT INTO [Clients] ([FullName],[Phone],[Email]) VALUES
 ('Иван Петров','+7 900 000-00-01','ivan@example.com'),
 ('Мария Смирнова','+7 900 000-00-02','maria@example.com');

INSERT INTO [Employees] ([FullName],[Role],[Phone],[HireDate],[Active]) VALUES
 ('Олег Кузнецов','Официант','+7 900 111-11-11', Now(), True),
 ('Анна Орлова','Хостес','+7 900 222-22-22', Now(), True);

INSERT INTO [DiningTables] ([TableNumber],[Capacity],[Zone]) VALUES
 ('T1',2,'Зал'),('T2',4,'Зал'),('V1',6,'VIP');

INSERT INTO [MenuCategories] ([CategoryName]) VALUES
 ('Горячее'),('Салаты'),('Напитки');

INSERT INTO [MenuItems] ([CategoryID],[ItemName],[Price],[IsActive]) VALUES
 (1,'Стейк',950.00, True), (2,'Цезарь',450.00, True), (3,'Эспрессо',150.00, True);

INSERT INTO [Reservations] ([ClientID],[TableID],[ReservedFor],[Guests],[Status])
VALUES (1,2, DateAdd('h', 24, Now()), 4, 'planned');

INSERT INTO [Visits] ([ClientID],[TableID],[EmployeeID],[CheckIn],[Status])
VALUES (1,2,1, Now(),'open');

INSERT INTO [Orders] ([VisitID],[CreatedAt],[Status]) VALUES (1, Now(),'open');

INSERT INTO [OrderItems] ([OrderID],[ItemID],[Qty],[Price]) VALUES
 (1,1,1,950.00), (1,3,2,150.00);

INSERT INTO [Payments] ([VisitID],[Amount],[Method],[PaidAt])
VALUES (1,1250.00,'card', Now());

INSERT INTO [Tickets] ([ClientID],[VisitID],[CreatedAt],[Channel],[Subject],[Body],[Status])
VALUES (1,1, Now(),'onsite','Замечание по сервису','Прошу подать горячее быстрее','open');

INSERT INTO [Reviews] ([ClientID],[VisitID],[Rating],[Comment],[CreatedAt])
VALUES (1,1,5,'Все супер!', Now());
