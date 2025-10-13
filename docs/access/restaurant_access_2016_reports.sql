-- Отчёты (MS Access 2016)

-- 1) Выручка по дням
SELECT DateValue(p.PaidAt) AS PayDate, SUM(p.Amount) AS Total
FROM Payments AS p
GROUP BY DateValue(p.PaidAt)
ORDER BY DateValue(p.PaidAt);

-- 2) Выручка по официантам
SELECT e.FullName AS Waiter, SUM(p.Amount) AS Total
FROM Payments AS p
INNER JOIN Visits AS v ON v.VisitID=p.VisitID
LEFT JOIN Employees AS e ON e.EmployeeID=v.EmployeeID
GROUP BY e.FullName
ORDER BY SUM(p.Amount) DESC;

-- 3) Средний чек по визиту
SELECT v.VisitID, SUM(oi.Qty*oi.Price) AS CheckSum
FROM Visits AS v
INNER JOIN Orders AS o ON o.VisitID=v.VisitID
INNER JOIN OrderItems AS oi ON oi.OrderID=o.OrderID
GROUP BY v.VisitID;

-- 4) Средний чек по клиентам
SELECT c.FullName, AVG(t.CheckSum) AS AvgCheck
FROM Clients AS c
INNER JOIN (
  SELECT v.ClientID, v.VisitID, SUM(oi.Qty*oi.Price) AS CheckSum
  FROM Visits AS v
  INNER JOIN Orders AS o ON o.VisitID=v.VisitID
  INNER JOIN OrderItems AS oi ON oi.OrderID=o.OrderID
  GROUP BY v.ClientID, v.VisitID
) AS t ON t.ClientID=c.ClientID
GROUP BY c.FullName
ORDER BY AVG(t.CheckSum) DESC;

-- 5) Загрузка столов (кол-во визитов по столам)
SELECT d.TableNumber, COUNT(*) AS VisitsCount
FROM Visits AS v
INNER JOIN DiningTables AS d ON d.TableID=v.TableID
GROUP BY d.TableNumber
ORDER BY COUNT(*) DESC;

-- 6) Конфликты броней (пересекающиеся по времени)
SELECT r1.ReservationID AS ResA, r2.ReservationID AS ResB, d.TableNumber,
       r1.ReservedFor AS TimeA, r2.ReservedFor AS TimeB
FROM Reservations AS r1
INNER JOIN Reservations AS r2 ON r1.TableID=r2.TableID AND r1.ReservationID<r2.ReservationID
INNER JOIN DiningTables AS d ON d.TableID=r1.TableID
WHERE Abs(DateDiff('n', r1.ReservedFor, r2.ReservedFor)) < 120;

-- 7) TOP-10 клиентов по выручке
SELECT TOP 10 c.FullName, SUM(p.Amount) AS TotalPaid
FROM Clients AS c
INNER JOIN Visits AS v ON v.ClientID=c.ClientID
INNER JOIN Payments AS p ON p.VisitID=v.VisitID
GROUP BY c.FullName
ORDER BY SUM(p.Amount) DESC;

-- 8) Отзывы: средняя оценка по официантам
SELECT e.FullName AS Waiter, AVG(r.Rating) AS AvgRating, COUNT(*) AS ReviewsCount
FROM Reviews AS r
INNER JOIN Visits AS v ON v.VisitID=r.VisitID
LEFT JOIN Employees AS e ON e.EmployeeID=v.EmployeeID
GROUP BY e.FullName
ORDER BY AVG(r.Rating) DESC;
