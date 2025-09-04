#!/bin/bash

# Redis数据提取脚本
# 用法: ./redis_data_extractor.sh

OUTPUT_FILE="redis_data_$(date +%Y%m%d_%H%M%S).json"
REDIS_CLI="redis-cli"

echo "Redis数据提取开始..." >&2
echo "输出文件: $OUTPUT_FILE" >&2

# 创建JSON输出
{
    echo '{'
    echo '  "timestamp": "'$(date -Iseconds)'",'
    echo '  "server_info": {'
    
    # 获取服务器基本信息
    echo -n '    "version": "'
    $REDIS_CLI info server | grep "redis_version:" | cut -d: -f2 | tr -d '\r'
    echo '",'
    
    echo -n '    "uptime_days": "'
    $REDIS_CLI info server | grep "uptime_in_days:" | cut -d: -f2 | tr -d '\r'
    echo '",'
    
    echo -n '    "connected_clients": "'
    $REDIS_CLI info clients | grep "connected_clients:" | cut -d: -f2 | tr -d '\r'
    echo '",'
    
    echo -n '    "used_memory_human": "'
    $REDIS_CLI info memory | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r'
    echo '",'
    
    echo -n '    "keyspace_hits": "'
    $REDIS_CLI info stats | grep "keyspace_hits:" | cut -d: -f2 | tr -d '\r'
    echo '",'
    
    echo -n '    "keyspace_misses": "'
    $REDIS_CLI info stats | grep "keyspace_misses:" | cut -d: -f2 | tr -d '\r'
    echo '"'
    
    echo '  },'
    echo '  "keyspace": {'
    
    # 获取keyspace信息
    $REDIS_CLI info keyspace | grep "^db" | while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            db=$(echo "$line" | cut -d: -f1)
            stats=$(echo "$line" | cut -d: -f2)
            echo "    \"$db\": \"$stats\","
        fi
    done | sed '$ s/,$//'
    
    echo '  },'
    echo '  "total_keys": "'$($REDIS_CLI dbsize)'",'
    echo '  "data": {'
    
    # 获取所有keys及其数据
    first=true
    $REDIS_CLI --scan | while IFS= read -r key; do
        if [[ -n "$key" ]]; then
            # 处理JSON分隔符
            if [ "$first" = true ]; then
                first=false
            else
                echo ","
            fi
            
            # 获取key的类型
            key_type=$($REDIS_CLI type "$key")
            
            echo -n "    \"$key\": {"
            echo -n "\"type\": \"$key_type\", \"value\": "
            
            case "$key_type" in
                "string")
                    value=$($REDIS_CLI get "$key" | sed 's/"/\\"/g')
                    echo -n "\"$value\""
                    ;;
                "list")
                    echo -n "["
                    $REDIS_CLI lrange "$key" 0 -1 | while IFS= read -r item; do
                        if [[ -n "$item" ]]; then
                            item_escaped=$(echo "$item" | sed 's/"/\\"/g')
                            echo -n "\"$item_escaped\","
                        fi
                    done | sed 's/,$//'
                    echo -n "]"
                    ;;
                "set")
                    echo -n "["
                    $REDIS_CLI smembers "$key" | while IFS= read -r member; do
                        if [[ -n "$member" ]]; then
                            member_escaped=$(echo "$member" | sed 's/"/\\"/g')
                            echo -n "\"$member_escaped\","
                        fi
                    done | sed 's/,$//'
                    echo -n "]"
                    ;;
                "zset")
                    echo -n "["
                    $REDIS_CLI zrange "$key" 0 -1 withscores | while IFS= read -r member; do
                        if [[ -n "$member" ]]; then
                            member_escaped=$(echo "$member" | sed 's/"/\\"/g')
                            echo -n "\"$member_escaped\","
                        fi
                    done | sed 's/,$//'
                    echo -n "]"
                    ;;
                "hash")
                    echo -n "{"
                    $REDIS_CLI hgetall "$key" | while IFS= read -r field; do
                        if [[ -n "$field" ]]; then
                            IFS= read -r value
                            field_escaped=$(echo "$field" | sed 's/"/\\"/g')
                            value_escaped=$(echo "$value" | sed 's/"/\\"/g')
                            echo -n "\"$field_escaped\": \"$value_escaped\","
                        fi
                    done | sed 's/,$//'
                    echo -n "}"
                    ;;
                *)
                    echo -n "\"unsupported_type\""
                    ;;
            esac
            
            # 获取TTL
            ttl=$($REDIS_CLI ttl "$key")
            echo -n ", \"ttl\": $ttl"
            echo -n "}"
        fi
    done
    
    echo ''
    echo '  }'
    echo '}'
} > "$OUTPUT_FILE"

echo "数据提取完成!" >&2
echo "文件已保存为: $OUTPUT_FILE" >&2
echo "文件大小: $(ls -lh "$OUTPUT_FILE" | awk '{print $5}')" >&2