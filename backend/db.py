"""
db.py
Thin wrapper around a mysql-connector connection pool so every route
can just call `db.query(...)` / `db.execute(...)` without repeating
connect/close boilerplate.
"""

import mysql.connector
from mysql.connector import pooling
from config import Config

_pool = None


def init_pool():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="medikiosk_pool",
            pool_size=10,
            host=Config.MYSQL_HOST,
            port=Config.MYSQL_PORT,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB,
            autocommit=True,
        )
    return _pool


def get_conn():
    pool = init_pool()
    return pool.get_connection()


def query(sql, params=None, fetchone=False):
    """SELECT helper -> returns list[dict] or single dict."""
    conn = get_conn()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params or ())
        result = cur.fetchone() if fetchone else cur.fetchall()
        cur.close()
        return result
    finally:
        conn.close()


def execute(sql, params=None):
    """INSERT/UPDATE/DELETE helper -> returns lastrowid."""
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(sql, params or ())
        conn.commit()
        last_id = cur.lastrowid
        cur.close()
        return last_id
    finally:
        conn.close()
