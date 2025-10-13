# MS Access: Ресторан — обслуживание клиентов

## Что входит
- restaurant_access_schema.sql — структура таблиц (DDL)
- restaurant_access_sample_data.sql — тестовые данные (INSERT)

## Как развернуть в MS Access (коротко)
1. Создайте новую базу данных (.accdb).
2. Вкладка «Создание» → «Конструктор запросов» → «SQL».
3. Откройте `restaurant_access_schema.sql`, скопируйте SQL и выполните.
4. По очереди выполните содержимое `restaurant_access_sample_data.sql` для тестовых данных.
5. В «Инструменты базы данных» → «Схема данных (Relationships)» свяжите поля:
   - Reservations.ClientID → Clients.ClientID
   - Reservations.TableID → Tables.TableID
   - Visits.ClientID → Clients.ClientID
   - Visits.TableID → Tables.TableID
   - Visits.EmployeeID → Employees.EmployeeID
   - Orders.VisitID → Visits.VisitID
   - OrderItems.OrderID → Orders.OrderID
   - OrderItems.ItemID → MenuItems.ItemID
   - Payments.VisitID → Visits.VisitID
   - Tickets.ClientID → Clients.ClientID
   - Tickets.VisitID → Visits.VisitID
   - Reviews.ClientID → Clients.ClientID
   - Reviews.VisitID → Visits.VisitID

## Полезные запросы (примеры)
- Брони на сегодня:
```sql
SELECT r.ReservationID, c.FullName, t.TableNumber, r.ReservedFor, r.Guests, r.Status
FROM Reservations r
JOIN Clients c ON r.ClientID=c.ClientID
JOIN Tables t ON r.TableID=t.TableID
WHERE DATEVALUE(r.ReservedFor)=DATE()
ORDER BY r.ReservedFor;
```

- Открытые визиты и текущие заказы:
```sql
SELECT v.VisitID, c.FullName, t.TableNumber, v.CheckIn, e.FullName AS Waiter
FROM Visits v
JOIN Clients c ON v.ClientID=c.ClientID
JOIN Tables t ON v.TableID=t.TableID
LEFT JOIN Employees e ON v.EmployeeID=e.EmployeeID
WHERE v.Status='open';
```

- Чек по визиту (сумма заказа):
```sql
SELECT v.VisitID,
       SUM(oi.Qty * oi.Price) AS Total
FROM Visits v
JOIN Orders o ON o.VisitID=v.VisitID
JOIN OrderItems oi ON oi.OrderID=o.OrderID
WHERE v.VisitID=[Введите ID визита]
GROUP BY v.VisitID;
```

- ТОП клиентов по сумме:
```sql
SELECT c.FullName, SUM(p.Amount) AS TotalPaid
FROM Clients c
JOIN Visits v ON v.ClientID=c.ClientID
JOIN Payments p ON p.VisitID=v.VisitID
GROUP BY c.FullName
ORDER BY TotalPaid DESC;
```

- Открытые обращения:
```sql
SELECT t.TicketID, c.FullName, t.Subject, t.CreatedAt, t.Status
FROM Tickets t
JOIN Clients c ON c.ClientID=t.ClientID
WHERE t.Status<>'closed'
ORDER BY t.CreatedAt DESC;
```

## Мини-формы/отчеты (рекомендации)
- Форма «Клиент» с подформами: Брони, Визиты, Обращения, Отзывы.
- Форма «Визит» с подформами: Заказы и Позиции заказа, оплата.
- Отчёт «Чек по визиту»: на основе запроса суммы.

## Примечания Access
- Типы: AUTOINCREMENT, TEXT(n), MEMO (Long Text), DATETIME, CURRENCY, YESNO, LONG (целое/FK).
- NOW() в Access — функция текущей даты/времени. Если не работает в SQL-окне, подставьте Date() или Now().
- Ограничения FK лучше настраивать через Relationships (с каскадным обновлением/удалением при необходимости).
